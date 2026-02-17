const API = "https://backend-lbs-shop-59jc.vercel.app/api";

if(!localStorage.getItem("token")){
  location.href="login.html";
}

function show(id){
  document.getElementById("products").style.display="none";
  document.getElementById("orders").style.display="none";
  document.getElementById(id).style.display="block";
}

function logout(){
  localStorage.removeItem("token");
  location.href="login.html";
}

// PRODUITS
productForm.onsubmit = async e => {
  e.preventDefault();

  const data = new FormData(productForm);

  const res = await fetch(`${API}/admin/product`,{
    method:"POST",
    headers:{
      Authorization: "Bearer " + localStorage.getItem("token")
    },
    body:data
  });

  if(!res.ok) return alert("Erreur ajout produit");

  alert("Produit ajouté");
  productForm.reset();
  loadProducts();
};

async function loadProducts(){
  const res = await fetch(`${API}/products`);
  const products = await res.json();

  productList.innerHTML = products.map(p=>`
    <div class="card">
      <img src="https://backend-lbs-shop-59jc.vercel.app${p.image}" width="60">
      ${p.name} — ${p.finalPrice} FCFA
      <button onclick="del('${p.id}')">❌</button>
    </div>
  `).join("");
}

async function del(id){
  await fetch(`${API}/admin/product/${id}`,{
    method:"DELETE",
    headers:{
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  });
  loadProducts();
}

// COMMANDES
async function loadOrders(){
  const res = await fetch(`${API}/admin/orders`,{
    headers:{ Authorization:"Bearer "+localStorage.getItem("token") }
  });
  const orders = await res.json();

  orderList.innerHTML = orders.map(o=>`
    <div class="card">
      ${o.name} — ${o.products?.length || 1} article(s) — ${o.status}
      ${o.status==="EN_ATTENTE"?`<button onclick="confirmPay('${o.id}')">Valider</button>`:""}
    </div>
  `).join("");
}

async function confirmPay(id){
  await fetch(`${API}/admin/confirm/${id}`,{
    method:"POST",
    headers:{ Authorization:"Bearer "+localStorage.getItem("token") }
  });
  loadOrders();
}

loadProducts();
loadOrders();
