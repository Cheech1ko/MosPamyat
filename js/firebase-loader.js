

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey:            "ВАШЕ_API_KEY",
    authDomain:        "ВАШ_ПРОЕКТ.firebaseapp.com",
    projectId:         "ВАШ_ПРОЕКТ",
    storageBucket:     "ВАШ_ПРОЕКТ.appspot.com",
    messagingSenderId: "ВАШИ_ЦИФРЫ",
    appId:             "ВАШЕ_APP_ID"
};


const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);


let _productsCache = null;
let _configCache   = null;


async function loadConfig() {
    if (_configCache) return _configCache;
    try {
        const snap = await getDoc(doc(db, "config", "pricing"));
        _configCache = snap.exists() ? snap.data() : { coefficient: 1.5 };
    } catch(e) {
        _configCache = { coefficient: 1.5 };
    }
    return _configCache;
}


function calcPrice(product, coefficient) {

    if (product.price) return product.price;
    const raw = (product.volumeCm3 || 0) * (product.materialPricePerCm3 || 0)
            + (product.complexity || 0);
    return Math.round(raw * (coefficient || 1));
}

async function loadProducts(callback) {
    if (_productsCache) {
        callback(_productsCache);
        return;
    }

    try {
        const [snap, cfg] = await Promise.all([
            getDocs(collection(db, "products")),
            loadConfig()
        ]);

        const products = [];
        snap.forEach(d => {
            const data = { id: d.id, ...d.data() };
            data.price     = calcPrice(data, cfg.coefficient);
            data.basePrice = data.price;
            products.push(data);
        });

        products.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        _productsCache = products;
        callback(products);

    } catch(e) {
        console.error("[firebase-loader] Ошибка загрузки:", e);
        fetch("/data/products.json")
            .then(r => r.json())
            .then(callback)
            .catch(() => callback([]));
    }
}

window.loadProducts = loadProducts;
window.loadConfig   = loadConfig;
window.calcPrice    = calcPrice;
