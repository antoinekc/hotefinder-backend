import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    console.log("Headers reçus:", req.headers);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ result: false, error: 'Token non fourni' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log("Token extrait:", token);
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token décodé:", decodedToken);
    req.user = { userId: decodedToken.userId };
    console.log("req.user défini:", req.user);
    next();
  } catch (error) {
    console.log("Erreur token:", error);
    res.status(401).json({ result: false, error: 'Token invalide' });
  }
};

export default verifyToken;