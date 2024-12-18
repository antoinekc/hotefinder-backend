import { Router } from "express";
const router = Router();

import User from "../models/User.js";
import uid2 from "uid2";
import { hashSync, compareSync } from "bcrypt";
import jwt from "jsonwebtoken";
import { sanitizeUser } from "../utils/sanitizer.js";
import { verifyToken } from "../middlewares/verifyToken.js";

// POST pour créer un nouvel utilisateur
router.post("/signup", async (req, res) => {
  try {
    // Vérifiez si le password existe dans req.body
    if (!req.body.password || !req.body.email) {
      console.log("PASSWORD BODY >>>>>", req.body.email);
      return res.json({ result: false, error: "Password is required" });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.json({ result: false, error: "Cet utilisateur existe déjà" });
    }

    // Hash le mot de passe avec bcrypt
    const hash = hashSync(req.body.password, 10);

    const newUser = new User({
      email: req.body.email,
      password: hash,
      token: uid2(32),
      services: {
        creation_de_lannonce: false,
        gestion_du_menage: false,
        lavage_du_linge: false,
        optimisation_des_prix: false,
        remise_des_cles: false,
        checkin: false,
        checkout: false,
        boite_a_cles: false,
      },
    });

    const savedUser = await newUser.save();

    res.json({ result: true, user: savedUser });
  } catch (err) {
    res.json({ result: false, error: err.message });
  }
});

router.post("/signin", async (req, res) => {
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({
        result: false,
        error: "Email et mot de passe requis",
      });
    }

    // Utilisation de populate pour récupérer les adresses et services
    const user = await User.findOne({ email: req.body.email })
      .populate("address")
      .populate("services");

    if (!user) {
      return res.status(401).json({
        result: false,
        error: "Email ou mot de passe incorrect",
      });
    }

    const isValidPassword = compareSync(req.body.password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        result: false,
        error: "Email ou mot de passe incorrect",
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Inclure address et services dans les données renvoyées
    const userdata = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isHost: user.isHost,
      isActive: user.isActive,
      address: user.address,
      services: user.services,
    };

    console.log(userdata);

    console.log("Le TOKEN DE L'UTILISATEUR", token);
    res.json({
      result: true,
      token,
      user: userdata,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      result: false,
      error: "Erreur lors de la connexion",
    });
  }
});

router.post("/check-email", async (req, res) => {
  try {
    const data = await User.findOne({ email: req.body.email });
    if (data) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    return res.json({
      result: false,
      error: "Erreur lors de la vérification de l'email",
    });
  }
});

// ROUTES GET
/* GET users listing. */
router.get("/", async (req, res) => {
  try {
    const data = await User.find({});
    res.json({ result: true, users: data });
  } catch (err) {
    res.json({ result: false, error: err.message });
  }
});

// GET /users/concierges
router.get("/concierges", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    let query = { isHost: true, isActive: true };

    // Recherche par ville exacte
    if (city) {
      query["address.city"] = new RegExp(city, 'i');
      const exactMatches = await User.find(query);

      if (exactMatches.length > 0) {
        return res.json({
          result: true,
          concierges: exactMatches,
          isNearby: false
        });
      }
    }

    // Si pas de résultats exacts et qu'on a des coordonnées, chercher par proximité
    if (lat && lon) {
      const nearbyQuery = {
        isHost: true,
        isActive: true,
        "address.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lon), parseFloat(lat)]
            },
            $maxDistance: 50000 // 50km
          }
        }
      };

      const nearbyConcierges = await User.find(nearbyQuery).limit(10);
      
      return res.json({
        result: true,
        concierges: nearbyConcierges,
        isNearby: true
      });
    }

    // Si pas de filtres, retourner tous les concierges
    const allConcierges = await User.find(query);
    
    res.json({
      result: true,
      concierges: allConcierges,
      isNearby: false
    });

  } catch (error) {
    console.error("Error fetching concierges:", error);
    res.status(500).json({ result: false, error: "Erreur serveur" });
  }
});


router.get("/id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ result: false, message: "Token invalide" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded", decoded);

    const user = await User.findById(decoded.userId).populate(
      "services",
      null,
      null,
      { limit: 10 }
    );

    if (!user) {
      return res
        .status(404)
        .json({ result: false, message: "Utilisateur non trouvé" });
    }

    const userData = sanitizeUser({
      result: true,
      _id: user._id,
      isAdmin: user.isAdmin,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      address: user.addresses,
      services: user.services,
    });

    res.json(userData);
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ result: false, message: "Token invalide" });
    }
    res.status(500).json({
      result: false,
      message: "Erreur du serveur",
      details: error.message,
    });
  }
});

router.get("/search/services", async (req, res) => {
  try {
    // Récupérer les services depuis les query params
    const { services, city, postalCode } = req.query;

    //Construire le filtre de recherche
    const searchFilter = {
      isHost: true,
    };

    if (services) {
      const servicesList = services.split(',');
      const servicesFilter = {};
      servicesList.forEach(service => {
        if (service in {
          creation_de_lannonce: true,
          gestion_du_menage: true,
          lavage_du_linge: true,
          optimisation_des_prix: true,
          remise_des_cles: true,
          checkin: true,
          checkout: true,
          boite_a_cles: true
          }
        ) {
          servicesFilter[`services.${service}`] = true;
        }
      });

      Object.assign(searchFilter, servicesFilter).select(
        "firstName lastName email services address"
      );
    }

    // Filtrer par localisation
    if (city || postalCode) {
      // Chercher dans tous les éléments du tableau address
      if (city) {
        searchFilter["address.city"] = new RegExp(city, "i"); // 'i' pour recherche insensible à la casse
      }
      if (postalCode) {
        searchFilter["address.postalCode"] = postalCode;
      }
    }

    // Effectuer la recherche
    const concierges = await User.find(searchFilter).select(
      "firstName lastName email services address"
    );

    // Formater la réponse
    res.json({
      result: true,
      count: concierges.length,
      filters: {
        services: services ? services.split(",") : [],
        city,
        postalCode,
      },
      concierges: concierges.map((c) => ({
        _id: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        address: c.address,
        services: c.services,
      })),
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      result: false,
      error: "Erreur lors de la recherche des concierges",
    });
  }
});

//ROUTES UPDATE
// Mettre à jour un utilisateur
router.put("/:id", async (req, res) => {
  try {
    const updateUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updateUser) {
      return res
        .status(404)
        .json({ result: false, message: "Utilisateur non trouvé" });
    }

    res.json({ result: true, user: updateUser });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

router.put("/profile/update", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res
        .status(400)
        .json({ result: false, error: "ID utilisateur manquant" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ result: false, error: "Utilisateur non trouvé" });
    }

    const { firstName, lastName, email, address, isHost, isActive, services, profileImage } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (address) user.address = address;
    if (typeof isHost !== "undefined") user.isHost = isHost;
    if (typeof isActive !== "undefined") user.isActive = isActive;
    if (profileImage) user.profileImage = profileImage;
    if (services) {
      // Vérification que les services sont valides
      const validServices = [
        "creation_de_lannonce",
        "gestion_du_menage",
        "lavage_du_linge",
        "optimisation_des_prix",
        "remise_des_cles",
        "checkin",
        "checkout",
        "boite_a_cles",
      ];

      // Ne mettre à jour que les services valides
      Object.keys(services).forEach((service) => {
        if (validServices.includes(service)) {
          user.services[service] = services[service];
        }
      });
    }

    await user.save();

    res.json({
      result: true,
      user: {
        token: req.headers.authorization.split(" ")[1],
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        address: user.address,
        isHost: user.isHost,
        isActive: user.isActive,
        services: user.services,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ result: false, error: error.message });
  }
});

router.patch("/address/:id", async (req, res) => {
  try {
    const updateUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { address: req.body } }, // Changed $set to $push
      { new: true }
    );

    if (!updateUser) {
      return res
        .status(404)
        .json({ result: false, message: "Utilisateur non trouvé" });
    }
    res.json({ result: true, user: updateUser });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

// Mettre à jour un utilisateur
router.put("/services/:id", async (req, res) => {
  try {
    const validServices = [
      "creation_de_lannonce",
      "gestion_du_menage",
      "lavage_du_linge",
      "optimisation_des_prix",
      "remise_des_cles",
      "checkin",
      "checkout",
      "boite_a_cles",
    ];

    const services = {};
    Object.keys(req.body).forEach((service) => {
      if (validServices.includes(service)) {
        services[`services.${service}`] = req.body[service];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { services: req.body } },
      { new: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ result: false, error: "Utilisateur non trouvé" });
    }

    res.json({ result: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }
});

//ROUTES DELETE

// Supprimer un utilisateur
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const deleteUser = await User.findByIdAndDelete(userId);
    if (!deleteUser) {
      return res.json({ result: false, message: "Utilisateur introuvable" });
    }
    res.json({ result: true, message: "Votre compte a bien été supprimé" });
  } catch (error) {
    res.json({ result: false, message: "Erreur lors de la suppression" });
  }
});

export default router;
