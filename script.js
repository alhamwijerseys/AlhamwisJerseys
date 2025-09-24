/* CONFIG */
const CONFIG = {
  PAYPAL_CLIENT_ID: "YOUR_PAYPAL_CLIENT_ID", // replace with your live ID
  PRODUCTS: [
    {id:1,name:"Alhamwi Long Sleeve 1",category:"Long Sleeve",price:30,image:"https://via.placeholder.com/300x300",desc:"Premium long sleeve jersey."},
    {id:2,name:"Alhamwi Short Sleeve 1",category:"Short Sleeve",price:25,image:"https://via.placeholder.com/300x300",desc:"Cool short sleeve jersey."},
    {id:3,name:"Alhamwi Hoodie 1",category:"Hoodies",price:50,image:"https://via.placeholder.com/300x300",desc:"Warm hoodie."},
    {id:4,name:"Alhamwi Long Sleeve 2",category:"Long Sleeve",price:35,image:"https://via.placeholder.com/300x300",desc:"Another long sleeve jersey."}
  ]
};

/* Cart */
let CART = JSON.parse(localStorage.getItem("CART")) || [];
function saveCart(){ localStorage.setItem("CART", JSON.stringify(CART)); }
function updateCartCount(){ document.querySelectorAll("#cart-count").forEach(el=>el.innerText=CART.length); }
updateCartCount();

/* Product Grid Rendering */
function renderProducts(filter=""){
  const grid = document.getElementById("product-grid");
  if(!grid) return;
  grid.innerHTML = "";
  CONFIG.PRODUCTS.filter(p => filter=="" || filter=="all" || p.category==filter).forEach(p=>{
    const card = document.createElement("div");
    card.className="product-card";
    card.innerHTML=`<img src="${p.image}" alt="${p.name}"><h3>${p.name}</h3><div class="price">$${p.price}</div>`;
    card.onclick=()=>{ window.location.href="product.html?id="+p.id; };
    grid.appendChild(card);
  });
}

/* Search & Category */
const searchInput=document.getElementById("search-input");
if(searchInput){ searchInput.addEventListener("input",(e)=>{
  renderProducts(e.target.value==""? "": CONFIG.PRODUCTS.filter(p=>p.name.toLowerCase().includes(e.target.value.toLowerCase())).map(p=>p.id));
});}
document.querySelectorAll(".cat-buttons button").forEach(btn=>{
  btn.addEventListener("click",()=> renderProducts(btn.dataset.cat));
});

/* Product Detail Page */
function loadProductPage(){
  const pid=new URLSearchParams(window.location.search).get("id");
  const product=CONFIG.PRODUCTS.find(p=>p.id==pid);
  if(!product) return;
  document.getElementById("product-title").innerText=product.name;
  document.getElementById("product-price").innerText="$"+product.price;
  document.getElementById("product-desc").innerText=product.desc;
  document.getElementById("product-image").src=product.image;

  // Add to Cart
  document.getElementById("add-to-cart").onclick=()=>{
    const qty=parseInt(document.getElementById("product-qty").value)||1;
    const existing=CART.find(i=>i.id==product.id);
    if(existing) existing.qty+=qty;
    else CART.push({id:product.id,qty:qty});
    saveCart(); updateCartCount(); alert("Added to cart");
  }

  // PayPal Buy Now (basic)
  const buyBtn=document.getElementById("buy-now-paypal");
  buyBtn.href=`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=623-999-4408&item_name=${encodeURIComponent(product.name)}&amount=${product.price}&currency_code=USD`;
}

/* Reviews */
if(document.getElementById("review-form")){
  const reviewForm=document.getElementById("review-form");
  const list=document.getElementById("reviews-list");
  const REVIEWS=JSON.parse(localStorage.getItem("REVIEWS")||"{}");
  const pid=new URLSearchParams(window.location.search).get("id");

  function renderReviews(){
    list.innerHTML="";
    (REVIEWS[pid]||[]).forEach(r=>{
      const div=document.createElement("div");
      div.className="review";
      div.innerHTML=`<strong>${r.name}</strong> (${r.rating}/5): <p>${r.comment}</p>`;
      list.appendChild(div);
    });
  }
  renderReviews();

  reviewForm.onsubmit=e=>{
    e.preventDefault();
    const data=new FormData(reviewForm);
    if(!REVIEWS[pid]) REVIEWS[pid]=[];
    REVIEWS[pid].push({name:data.get("name"),rating:data.get("rating"),comment:data.get("comment")});
    localStorage.setItem("REVIEWS", JSON.stringify(REVIEWS));
    renderReviews();
    reviewForm.reset();
  }
}

/* Cart Page */
function loadCartPage(){
  const container=document.getElementById("cart-contents");
  const summary=document.getElementById("cart-summary");
  if(!container) return;
  container.innerHTML="";
  let total=0;
  CART.forEach(item=>{
    const product=CONFIG.PRODUCTS.find(p=>p.id==item.id);
    if(!product) return;
    const div=document.createElement("div");
    div.className="cart-item";
    div.innerHTML=`<img src="${product.image}"><div><strong>${product.name}</strong><span>$${product.price}</span><span>Qty: ${item.qty}</span><button class="remove">Remove</button></div>`;
    div.querySelector(".remove").onclick=()=>{
      CART=CART.filter(i=>i.id!=item.id);
      saveCart(); updateCartCount(); loadCartPage();
    };
    container.appendChild(div);
    total+=product.price*item.qty;
  });
  if(summary){
    summary.innerHTML=`<h3>Cart Summary</h3>
    <p>Subtotal: $${total.toFixed(2)}</p>
    <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_cart&business=623-999-4408&upload=1" target="_blank"><button>Checkout with PayPal</button></a>`;
  }
}

/* Initialize pages */
document.addEventListener("DOMContentLoaded",()=>{
  renderProducts();
  loadProductPage();
  loadCartPage();
  document.querySelectorAll("#year, #year2, #year3, #year4, #year5, #year6").forEach(el=>el.innerText=new Date().getFullYear());
});
