const API = "https://backend-lbs-shop-59jc.vercel.app/api";

if(!localStorage.getItem("user_token")){
  location.href = "../auth/login.html";
}

let allProducts = [];

async function loadProducts(){
  const res = await fetch(`${API}/products`);
  allProducts = await res.json();
  display(allProducts);
}

function display(list){
  products.innerHTML = list.map(p=>`
    <div class="card">
      <img src="${p.image}" alt="">
      ${p.promo ? `<span class="badge">-${p.promo}%</span>` : ""}

      <h3>${p.name}</h3>

      <p class="price">
        ${p.promo ? `<span class="old">${p.price} FCFA</span>` : ""}
        <span>${p.finalPrice || p.price} FCFA</span>
      </p>

      <a href="product.html?id=${p.id}" class="btn">Voir</a>
    </div>
  `).join("");
}

search.oninput = filter;
category.onchange = filter;
promo.onchange = filter;

function filter(){
  let list = allProducts;

  if(search.value){
    list = list.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()));
  }

  if(category.value){
    list = list.filter(p => p.category === category.value);
  }

  if(promo.value === "promo"){
    list = list.filter(p => p.promo > 0);
  }

  display(list);
}

loadProducts();
