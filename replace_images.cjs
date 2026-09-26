const fs = require('fs');

let code = fs.readFileSync('src/data/products.ts', 'utf8');
code = code.replace(/export const categories/, "const getImg = (name: string) => import.meta.env.BASE_URL + 'images/' + name;\n\nexport const categories");

code = code.replace(/image: 'https:\/\/images.unsplash.com[^']+'/g, (match) => {
  if (match.includes('1589135233689') || match.includes('1600803907087') || match.includes('1568909344668') || match.includes('1604908176997')) return "image: getImg('pickle.jpg')";
  if (match.includes('1596040033229') || match.includes('1601050690597') || match.includes('1585032226651') || match.includes('1597481499750')) return "image: getImg('karam.jpg')";
  if (match.includes('1612966809150') || match.includes('1567188040759')) return "image: getImg('masala.jpg')";
  return match;
});

code = code.replace(/images: \[\s+'https:\/\/images.unsplash.com[^\]]+\]/g, (match) => {
  if (match.includes('1589135233689') || match.includes('1600803907087') || match.includes('1568909344668') || match.includes('1604908176997')) return "images: [getImg('pickle.jpg')]";
  if (match.includes('1596040033229') || match.includes('1601050690597') || match.includes('1585032226651') || match.includes('1597481499750')) return "images: [getImg('karam.jpg')]";
  if (match.includes('1612966809150') || match.includes('1567188040759')) return "images: [getImg('masala.jpg')]";
  return match;
});

fs.writeFileSync('src/data/products.ts', code);
