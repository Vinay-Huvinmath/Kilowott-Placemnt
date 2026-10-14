import { WooCommerceProvider, WooCustomer, WooOrder, WooOrderItem } from './woocommerce.provider.js';

interface RawCustomerDef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  orderSpecs: Array<{
    daysAgo: number;
    status: 'completed' | 'processing' | 'pending' | 'refunded';
    items: Array<{ name: string; qty: number; price: number }>;
  }>;
}

const PRODUCTS = {
  kunbiSaree: { name: 'Kunbi Handwoven Saree', price: 9200 },
  cashewBrittle: { name: 'Cashew Brittle Box (400g)', price: 650 },
  terracottaDiya: { name: 'Terracotta Diya Set (6-pack)', price: 1200 },
  ceramicJar: { name: 'Feni Glazed Ceramic Jar', price: 2400 },
  kokumBalm: { name: 'Goan Kokum Butter Balm', price: 480 },
  marioMug: { name: 'Mario Miranda Illustrated Mug', price: 850 },
  bebincaTin: { name: 'Bebinca Traditional Cake Tin', price: 750 },
  cottonLungi: { name: 'Handwoven Cotton Lungi', price: 1800 },
  brassGrater: { name: 'Brass Coconut Grater', price: 3100 },
  seaSalt: { name: 'Goan Sea Salt & Herb Pouch', price: 520 },
  azulejoTile: { name: 'Portuguese Azulejo Tile Trivet', price: 1450 },
  redRice: { name: 'Goa Red Rice Heritage Sack (5kg)', price: 890 }
};

const MOCK_CUSTOMERS_DATA: RawCustomerDef[] = [
  // 1. VIP with 60+ days silence (Savio Fernandes: spent > 50,000, last order 68 days ago)
  {
    id: 101,
    firstName: 'Savio',
    lastName: 'Fernandes',
    email: 'savio.fernandes@goa.mail',
    phone: '+91 98221 40912',
    city: 'Panjim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 68, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 2, price: 9200 }, { name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] },
      { daysAgo: 85, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 110, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.azulejoTile.name, qty: 2, price: 1450 }] },
      { daysAgo: 135, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 2, price: 3100 }, { name: PRODUCTS.cashewBrittle.name, qty: 4, price: 650 }] },
      { daysAgo: 160, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 178, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 2, price: 2400 }, { name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] },
      { daysAgo: 195, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] }
    ]
  },
  // 2. VIP (Pooja Hegde: spent > 75k, recent active)
  {
    id: 102,
    firstName: 'Pooja',
    lastName: 'Hegde',
    email: 'pooja.hegde@margaomail.in',
    phone: '+91 98224 88201',
    city: 'Margao',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 12, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 2, price: 9200 }, { name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 32, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.azulejoTile.name, qty: 2, price: 1450 }] },
      { daysAgo: 50, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }, { name: PRODUCTS.ceramicJar.name, qty: 2, price: 2400 }] },
      { daysAgo: 72, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 94, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 118, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 3, price: 1800 }, { name: PRODUCTS.cashewBrittle.name, qty: 4, price: 650 }] },
      { daysAgo: 144, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 168, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }, { name: PRODUCTS.azulejoTile.name, qty: 1, price: 1450 }] },
      { daysAgo: 190, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] }
    ]
  },
  // 3. VIP (Vikramaditya Rao: spent > 54k)
  {
    id: 103,
    firstName: 'Vikramaditya',
    lastName: 'Rao',
    email: 'vikram.rao@bengaluru.tech',
    phone: '+91 98450 11983',
    city: 'Bengaluru',
    state: 'Karnataka',
    orderSpecs: [
      { daysAgo: 18, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 2, price: 9200 }] },
      { daysAgo: 45, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 78, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] },
      { daysAgo: 112, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 148, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }, { name: PRODUCTS.azulejoTile.name, qty: 2, price: 1450 }] },
      { daysAgo: 182, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] }
    ]
  },
  // 4. VIP (Ananya Deshmukh: spent > 52k)
  {
    id: 104,
    firstName: 'Ananya',
    lastName: 'Deshmukh',
    email: 'ananya.deshmukh@mumbai.co',
    phone: '+91 98200 93411',
    city: 'Mumbai',
    state: 'Maharashtra',
    orderSpecs: [
      { daysAgo: 5, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 38, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 2, price: 9200 }] },
      { daysAgo: 82, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 124, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 165, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 2, price: 2400 }, { name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }, { name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] }
    ]
  },
  // 5. At Risk (Rajesh Kamath: last order 125 days ago)
  {
    id: 105,
    firstName: 'Rajesh',
    lastName: 'Kamath',
    email: 'rajesh.kamath@mangaluru.biz',
    phone: '+91 94480 32190',
    city: 'Mangaluru',
    state: 'Karnataka',
    orderSpecs: [
      { daysAgo: 125, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }, { name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 155, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 2, price: 2400 }] },
      { daysAgo: 188, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 3, price: 1800 }] }
    ]
  },
  // 6. At Risk (Fatima Alvares: last order 108 days ago)
  {
    id: 106,
    firstName: 'Fatima',
    lastName: 'Alvares',
    email: 'fatima.alvares@mapusa.goa',
    phone: '+91 98221 77310',
    city: 'Mapusa',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 108, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }, { name: PRODUCTS.bebincaTin.name, qty: 2, price: 750 }] },
      { daysAgo: 134, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 162, status: 'completed', items: [{ name: PRODUCTS.azulejoTile.name, qty: 2, price: 1450 }] },
      { daysAgo: 192, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] }
    ]
  },
  // 7. At Risk (Sunil Chodankar: last order 140 days ago)
  {
    id: 107,
    firstName: 'Sunil',
    lastName: 'Chodankar',
    email: 'sunil.chodankar@vasco.org',
    phone: '+91 98229 00451',
    city: 'Vasco da Gama',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 140, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 180, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] }
    ]
  },
  // 8. At Risk (Meera Joshi: last order 98 days ago)
  {
    id: 108,
    firstName: 'Meera',
    lastName: 'Joshi',
    email: 'meera.joshi@pune.co',
    phone: '+91 98900 12039',
    city: 'Pune',
    state: 'Maharashtra',
    orderSpecs: [
      { daysAgo: 98, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 138, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 175, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 1, price: 1200 }, { name: PRODUCTS.cashewBrittle.name, qty: 1, price: 650 }] }
    ]
  },
  // 9. At Risk (Deepak Pai: last order 115 days ago)
  {
    id: 109,
    firstName: 'Deepak',
    lastName: 'Pai',
    email: 'deepak.pai@porvorim.net',
    phone: '+91 98223 66192',
    city: 'Porvorim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 115, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 2, price: 2400 }] },
      { daysAgo: 160, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] }
    ]
  },
  // 10. Loyal (Rohan Kenkre: 6 orders, last order 14 days ago)
  {
    id: 110,
    firstName: 'Rohan',
    lastName: 'Kenkre',
    email: 'rohan.kenkre@ponda.in',
    phone: '+91 98225 18273',
    city: 'Ponda',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 14, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }, { name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 40, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 74, status: 'completed', items: [{ name: PRODUCTS.azulejoTile.name, qty: 2, price: 1450 }] },
      { daysAgo: 102, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 136, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] },
      { daysAgo: 172, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 1, price: 1800 }] }
    ]
  },
  // 11. Loyal (Sneha Naik: 5 orders, last order 22 days ago)
  {
    id: 111,
    firstName: 'Sneha',
    lastName: 'Naik',
    email: 'sneha.naik@panjim.org',
    phone: '+91 98221 99014',
    city: 'Panjim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 22, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 54, status: 'completed', items: [{ name: PRODUCTS.azulejoTile.name, qty: 2, price: 1450 }] },
      { daysAgo: 88, status: 'completed', items: [{ name: PRODUCTS.cashewBrittle.name, qty: 3, price: 650 }] },
      { daysAgo: 122, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 166, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] }
    ]
  },
  // 12. Loyal (Aarav Prabhu: 6 orders, last order 8 days ago)
  {
    id: 112,
    firstName: 'Aarav',
    lastName: 'Prabhu',
    email: 'aarav.prabhu@bengaluru.in',
    phone: '+91 98455 33021',
    city: 'Bengaluru',
    state: 'Karnataka',
    orderSpecs: [
      { daysAgo: 8, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 34, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 66, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] },
      { daysAgo: 95, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 128, status: 'completed', items: [{ name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 164, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 1, price: 1800 }] }
    ]
  },
  // 13. Loyal (Kavita Borkar: 5 orders, last order 35 days ago)
  {
    id: 113,
    firstName: 'Kavita',
    lastName: 'Borkar',
    email: 'kavita.borkar@margao.co',
    phone: '+91 98222 41908',
    city: 'Margao',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 35, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }, { name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 64, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 92, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] },
      { daysAgo: 130, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] },
      { daysAgo: 170, status: 'completed', items: [{ name: PRODUCTS.azulejoTile.name, qty: 1, price: 1450 }] }
    ]
  },
  // 14. Loyal (Tariq Sayed: 5 orders, last order 19 days ago)
  {
    id: 114,
    firstName: 'Tariq',
    lastName: 'Sayed',
    email: 'tariq.sayed@vasco.org',
    phone: '+91 98228 11492',
    city: 'Vasco da Gama',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 19, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 48, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] },
      { daysAgo: 79, status: 'completed', items: [{ name: PRODUCTS.cashewBrittle.name, qty: 3, price: 650 }] },
      { daysAgo: 114, status: 'completed', items: [{ name: PRODUCTS.marioMug.name, qty: 2, price: 850 }] },
      { daysAgo: 152, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] }
    ]
  },
  // 15. Regular (Aditya Salgaocar: 3 orders, last order 30 days ago)
  {
    id: 115,
    firstName: 'Aditya',
    lastName: 'Salgaocar',
    email: 'aditya.salgaocar@panjim.org',
    phone: '+91 98221 34912',
    city: 'Panjim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 30, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 65, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] },
      { daysAgo: 120, status: 'completed', items: [{ name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] }
    ]
  },
  // 16. Regular (Nisha Shirwaikar: 3 orders, last order 42 days ago)
  {
    id: 116,
    firstName: 'Nisha',
    lastName: 'Shirwaikar',
    email: 'nisha.s@candolim.resort',
    phone: '+91 98226 71923',
    city: 'Candolim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 42, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }, { name: PRODUCTS.azulejoTile.name, qty: 1, price: 1450 }] },
      { daysAgo: 80, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 135, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] }
    ]
  },
  // 17. Regular (Gautam Shenoy: 2 orders, last order 28 days ago)
  {
    id: 117,
    firstName: 'Gautam',
    lastName: 'Shenoy',
    email: 'gautam.shenoy@udupi.in',
    phone: '+91 94481 92831',
    city: 'Udupi',
    state: 'Karnataka',
    orderSpecs: [
      { daysAgo: 28, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 70, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] }
    ]
  },
  // 18. Regular (Preeti Kunkolienkar: 4 orders, last order 16 days ago)
  {
    id: 118,
    firstName: 'Preeti',
    lastName: 'Kunkolienkar',
    email: 'preeti.k@calangute.goa',
    phone: '+91 98227 44812',
    city: 'Calangute',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 16, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 44, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] },
      { daysAgo: 86, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] },
      { daysAgo: 140, status: 'completed', items: [{ name: PRODUCTS.azulejoTile.name, qty: 1, price: 1450 }] }
    ]
  },
  // 19. Regular (Zainab Shaikh: 3 orders, last order 50 days ago)
  {
    id: 119,
    firstName: 'Zainab',
    lastName: 'Shaikh',
    email: 'zainab.shaikh@belagavi.co',
    phone: '+91 98452 77189',
    city: 'Belagavi',
    state: 'Karnataka',
    orderSpecs: [
      { daysAgo: 50, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 84, status: 'completed', items: [{ name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 128, status: 'completed', items: [{ name: PRODUCTS.bebincaTin.name, qty: 2, price: 750 }] }
    ]
  },
  // 20. Regular (Harish Angle: 2 orders, last order 62 days ago)
  {
    id: 120,
    firstName: 'Harish',
    lastName: 'Angle',
    email: 'harish.angle@margao.org',
    phone: '+91 98223 88109',
    city: 'Margao',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 62, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }, { name: PRODUCTS.marioMug.name, qty: 2, price: 850 }] },
      { daysAgo: 115, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }] }
    ]
  },
  // 21. Regular (Divya D'Souza: 3 orders, last order 44 days ago)
  {
    id: 121,
    firstName: 'Divya',
    lastName: "D'Souza",
    email: 'divya.dsouza@siolim.in',
    phone: '+91 98221 66491',
    city: 'Siolim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 44, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 76, status: 'completed', items: [{ name: PRODUCTS.cashewBrittle.name, qty: 2, price: 650 }] },
      { daysAgo: 130, status: 'completed', items: [{ name: PRODUCTS.azulejoTile.name, qty: 1, price: 1450 }] }
    ]
  },
  // 22. Regular (Kunal Velingkar: 2 orders, last order 38 days ago)
  {
    id: 122,
    firstName: 'Kunal',
    lastName: 'Velingkar',
    email: 'kunal.velingkar@oldgoa.in',
    phone: '+91 98224 55102',
    city: 'Old Goa',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 38, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }] },
      { daysAgo: 90, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] }
    ]
  },
  // 23. Regular (Alisha Coutinho: 3 orders, last order 25 days ago)
  {
    id: 123,
    firstName: 'Alisha',
    lastName: 'Coutinho',
    email: 'alisha.coutinho@assagao.villa',
    phone: '+91 98220 89410',
    city: 'Assagao',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 25, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] },
      { daysAgo: 60, status: 'completed', items: [{ name: PRODUCTS.ceramicJar.name, qty: 1, price: 2400 }] },
      { daysAgo: 105, status: 'completed', items: [{ name: PRODUCTS.marioMug.name, qty: 2, price: 850 }] }
    ]
  },
  // 24. Regular (Manish Karapurkar: 2 orders, last order 55 days ago)
  {
    id: 124,
    firstName: 'Manish',
    lastName: 'Karapurkar',
    email: 'manish.k@bicholim.org',
    phone: '+91 98225 33201',
    city: 'Bicholim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 55, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }, { name: PRODUCTS.bebincaTin.name, qty: 1, price: 750 }] },
      { daysAgo: 120, status: 'completed', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 2, price: 1200 }] }
    ]
  },
  // 25. New (Siddharth Shirodkar: 1 order, 4 days ago)
  {
    id: 125,
    firstName: 'Siddharth',
    lastName: 'Shirodkar',
    email: 'siddharth.s@anjuna.sea',
    phone: '+91 98228 90123',
    city: 'Anjuna',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 4, status: 'completed', items: [{ name: PRODUCTS.kunbiSaree.name, qty: 1, price: 9200 }] }
    ]
  },
  // 26. New (Pallavi Verlekar: 1 order, 7 days ago)
  {
    id: 126,
    firstName: 'Pallavi',
    lastName: 'Verlekar',
    email: 'pallavi.verlekar@panjim.gov',
    phone: '+91 98221 44098',
    city: 'Panjim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 7, status: 'completed', items: [{ name: PRODUCTS.brassGrater.name, qty: 1, price: 3100 }, { name: PRODUCTS.bebincaTin.name, qty: 1, price: 750 }] }
    ]
  },
  // 27. New (Eshaan Morajkar: 1 order, 11 days ago)
  {
    id: 127,
    firstName: 'Eshaan',
    lastName: 'Morajkar',
    email: 'eshaan.morajkar@morjim.beach',
    phone: '+91 98226 55019',
    city: 'Morjim',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 11, status: 'completed', items: [{ name: PRODUCTS.cottonLungi.name, qty: 2, price: 1800 }, { name: PRODUCTS.azulejoTile.name, qty: 1, price: 1450 }] }
    ]
  },
  // 28. New (Tanvi Lotlikar: 1 order, 2 days ago)
  {
    id: 128,
    firstName: 'Tanvi',
    lastName: 'Lotlikar',
    email: 'tanvi.lotlikar@colva.in',
    phone: '+91 98223 12984',
    city: 'Colva',
    state: 'Goa',
    orderSpecs: [
      { daysAgo: 2, status: 'processing', items: [{ name: PRODUCTS.terracottaDiya.name, qty: 1, price: 1200 }, { name: PRODUCTS.cashewBrittle.name, qty: 1, price: 650 }, { name: PRODUCTS.kokumBalm.name, qty: 1, price: 480 }] }
    ]
  }
];

export class MockWooCommerceProvider implements WooCommerceProvider {
  async getCustomers(): Promise<WooCustomer[]> {
    return MOCK_CUSTOMERS_DATA.map(c => {
      const oldestDaysAgo = Math.max(...c.orderSpecs.map(o => o.daysAgo));
      const createdDate = new Date(Date.now() - oldestDaysAgo * 86400000 - 86400000 * 2).toISOString();
      return {
        id: c.id,
        first_name: c.firstName,
        last_name: c.lastName,
        email: c.email,
        date_created: createdDate,
        billing: {
          first_name: c.firstName,
          last_name: c.lastName,
          email: c.email,
          phone: c.phone,
          city: c.city,
          state: c.state,
          country: 'India'
        }
      };
    });
  }

  async getOrders(): Promise<WooOrder[]> {
    const orders: WooOrder[] = [];
    let orderNumSeq = 2000;
    let itemSeq = 5000;

    for (const c of MOCK_CUSTOMERS_DATA) {
      for (const spec of c.orderSpecs) {
        orderNumSeq += 1;
        const orderDate = new Date(Date.now() - spec.daysAgo * 86400000).toISOString();
        let total = 0;
        const line_items: WooOrderItem[] = [];

        for (const it of spec.items) {
          itemSeq += 1;
          const lineTotal = it.price * it.qty;
          total += lineTotal;
          line_items.push({
            id: itemSeq,
            product_id: 800 + (itemSeq % 20),
            name: it.name,
            quantity: it.qty,
            price: it.price,
            total: lineTotal.toString()
          });
        }

        orders.push({
          id: orderNumSeq,
          number: `PULSE-${orderNumSeq}`,
          customer_id: c.id,
          status: spec.status,
          total: total.toString(),
          date_created: orderDate,
          billing: {
            first_name: c.firstName,
            last_name: c.lastName,
            email: c.email,
            phone: c.phone,
            city: c.city,
            state: c.state,
            country: 'India'
          },
          line_items
        });
      }
    }

    // Sort descending by order date
    orders.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    return orders;
  }
}
