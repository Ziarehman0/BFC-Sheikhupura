/* =========================================================
   BFC WEBSITE JAVASCRIPT
========================================================= */


/* =========================================================
   MOBILE MENU
========================================================= */

function toggleMobileMenu() {
    const menu = document.getElementById("mobile-menu");

    if (menu) {
        menu.classList.toggle("open");
    }
}

function closeMobileMenu() {
    const menu = document.getElementById("mobile-menu");

    if (menu) {
        menu.classList.remove("open");
    }
}


/* =========================================================
   CALL MODAL
========================================================= */

function openCallModal() {
    document.getElementById("call-modal").classList.add("active");
}

function closeCallModal() {
    document.getElementById("call-modal").classList.remove("active");
}


/* =========================================================
   WHATSAPP MODAL
========================================================= */

let pendingWhatsappMessage = "";

function openWhatsappModal() {
    document.getElementById("wa-modal").classList.add("active");
}

function closeWhatsappModal() {
    document.getElementById("wa-modal").classList.remove("active");
}

function openWhatsapp(number) {

    let url = `https://wa.me/${number}`;

    if (pendingWhatsappMessage) {
        url += `?text=${encodeURIComponent(pendingWhatsappMessage)}`;
        pendingWhatsappMessage = "";
    }

    window.open(url, "_blank");

    closeWhatsappModal();
}

/* =========================================================
   CART SYSTEM
========================================================= */

let cart = JSON.parse(localStorage.getItem("bfcCart")) || [];


/*
    Cart structure:

    {
        id: "meal-1",
        name: "Meal 1",
        price: 1180,
        quantity: 1
    }
*/


function saveCart() {
    localStorage.setItem("bfcCart", JSON.stringify(cart));
}


function getCartItemCount() {

    return cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);
}


function getCartTotal() {

    return cart.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
}


function addToCart(itemName, price) {

    const existingItem = cart.find(item => item.name === itemName);

    if (existingItem) {

        existingItem.quantity += 1;

    } else {

        cart.push({
            id: Date.now().toString() + Math.random().toString(16).slice(2),
            name: itemName,
            price: Number(price),
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    showCartNotification(itemName);

}


function increaseCartItem(index) {

    if (!cart[index]) return;

    cart[index].quantity += 1;

    saveCart();
    updateCartUI();
}


function decreaseCartItem(index) {

    if (!cart[index]) return;

    cart[index].quantity -= 1;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    saveCart();
    updateCartUI();
}


function removeCartItem(index) {

    if (!cart[index]) return;

    cart.splice(index, 1);

    saveCart();
    updateCartUI();
}


function clearCart() {

    if (cart.length === 0) return;

    const confirmed = confirm("Kya aap poora cart clear karna chahte hain?");

    if (!confirmed) return;

    cart = [];

    saveCart();
    updateCartUI();
}


function updateCartUI() {

    const countElement = document.getElementById("cart-count");
    const cartItemsElement = document.getElementById("cart-items");
    const emptyElement = document.getElementById("cart-empty");
    const footerElement = document.getElementById("cart-footer");
    const totalElement = document.getElementById("cart-total-price");

    if (!countElement || !cartItemsElement) return;


    /* HEADER COUNT */

    countElement.innerText = getCartItemCount();


    /* EMPTY CART */

    if (cart.length === 0) {

        cartItemsElement.innerHTML = "";

        emptyElement.classList.remove("hidden");
        footerElement.classList.add("hidden");

        return;
    }


    /* CART HAS ITEMS */

    emptyElement.classList.add("hidden");
    footerElement.classList.remove("hidden");


    cartItemsElement.innerHTML = cart.map((item, index) => {

        const itemTotal = item.price * item.quantity;

        return `
            <div class="cart-item">

                <div>
                    <div class="cart-item-name">
                        ${escapeHtml(item.name)}
                    </div>

                    <div class="cart-item-price">
                        Rs. ${item.price.toLocaleString()}
                        × ${item.quantity}
                        = Rs. ${itemTotal.toLocaleString()}
                    </div>
                </div>

                <div class="cart-item-controls">

                    <button
                        class="qty-btn"
                        onclick="decreaseCartItem(${index})"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>

                    <span class="qty-value">
                        ${item.quantity}
                    </span>

                    <button
                        class="qty-btn"
                        onclick="increaseCartItem(${index})"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>

                    <button
                        class="remove-item-btn"
                        onclick="removeCartItem(${index})"
                        aria-label="Remove item"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>

            </div>
        `;

    }).join("");


    totalElement.innerText =
        `Rs. ${getCartTotal().toLocaleString()}`;
}


function openCartModal() {

    updateCartUI();

    document
        .getElementById("cart-modal")
        .classList.add("active");
}


function closeCartModal() {

    document
        .getElementById("cart-modal")
        .classList.remove("active");
}


/* =========================================================
   CART NOTIFICATION
========================================================= */

let notificationTimer;

function showCartNotification(itemName) {

    const notification =
        document.getElementById("cart-notification");

    const text =
        document.getElementById("cart-text");

    text.innerText =
        `${itemName} cart mein add ho gaya!`;

    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {
        notification.classList.remove("show");
    }, 2800);
}


/* =========================================================
   CHECKOUT SYSTEM
   DELIVERY / PICKUP
========================================================= */

let checkoutData = {
    orderType: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    pickupBranch: "",
    pickupBranchAddress: ""
};


/* =========================================================
   DELIVERY / PICKUP
========================================================= */

function selectOrderType(type) {

    if (cart.length === 0) {
        alert("Cart empty hai. Pehle koi item add karein.");
        return;
    }

    checkoutData = {
    orderType: type,
    name: "",
    phone: "",
    email: "",
    address: "",
    pickupBranch: "",
    pickupBranchAddress: ""
};

    createCheckoutModal();
    showCustomerDetails();
}


/* =========================================================
   CREATE CHECKOUT MODAL
========================================================= */

function createCheckoutModal() {

    let modal = document.getElementById("checkout-modal");

    if (modal) {
        modal.classList.add("active");
        return;
    }

    modal = document.createElement("div");

    modal.id = "checkout-modal";
    modal.className = "modal-overlay";

    modal.innerHTML = `
        <div class="modal-box checkout-modal-box">

            <button
                type="button"
                class="modal-close"
                onclick="closeCheckoutModal()"
            >
                <i class="fa-solid fa-times"></i>
            </button>

            <div id="checkout-content"></div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.classList.add("active");
}


/* =========================================================
   CUSTOMER DETAILS
========================================================= */

function showCustomerDetails() {

    createCheckoutModal();

    const content =
        document.getElementById("checkout-content");

    if (!content) return;


    const isDelivery =
        checkoutData.orderType === "delivery";


    content.innerHTML = `

        <div class="checkout-header">

            <div class="checkout-icon">

                <i class="fa-solid ${
                    isDelivery
                        ? "fa-truck"
                        : "fa-store"
                }"></i>

            </div>

            <h3>
                ${
                    isDelivery
                        ? "Delivery Details"
                        : "Pickup Details"
                }
            </h3>

            <p>
                Please apni details enter karein
            </p>

        </div>


        <div class="checkout-summary">

            <div>
                <span>Total Items</span>

                <strong>
                    ${getCartItemCount()}
                </strong>
            </div>

            <div>
                <span>Total Bill</span>

                <strong>
                    Rs. ${getCartTotal().toLocaleString()}
                </strong>
            </div>

        </div>


        <div class="checkout-section-title">
            Customer Details
        </div>


        <div class="checkout-form">

            <div class="checkout-field">

                <label>
                    Name
                </label>

                <input
                    type="text"
                    id="customer-name"
                    placeholder="Apna naam"
                    autocomplete="name"
                >

            </div>


            <div class="checkout-field">

                <label>
                    Phone Number
                </label>

                <input
                    type="tel"
                    id="customer-phone"
                    placeholder="03XX XXXXXXX"
                    autocomplete="tel"
                >

            </div>


            <div class="checkout-field">

                <label>
                    Email
                </label>

                <input
                    type="email"
                    id="customer-email"
                    placeholder="example@email.com"
                    autocomplete="email"
                >

            </div>


            ${
                isDelivery
                    ? `

                        <div class="checkout-field">

                            <label>
                                Delivery Address
                            </label>

                            <textarea
                                id="customer-address"
                                rows="3"
                                placeholder="Complete delivery address"
                                autocomplete="street-address"
                            ></textarea>

                        </div>

                    `
                    : ""
            }


            ${
                !isDelivery
                    ? `

                        <div class="checkout-section-title pickup-branch-title">
                            Select Pickup Branch
                        </div>


                        <div class="pickup-branches">

                            <label class="pickup-branch-card">

                                <input
                                    type="radio"
                                    name="pickup-branch"
                                    value="Branch 1"
                                    data-address="Housing Colony, Main Market, Sheikhupura"
                                >

                                <div class="branch-card-content">

                                    <div class="branch-icon">
                                        <i class="fa-solid fa-store"></i>
                                    </div>

                                    <div class="branch-info">

                                        <strong>
                                            Branch 1
                                        </strong>

                                        <span>
                                            Housing Colony, Main Market, Sheikhupura
                                        </span>

                                    </div>

                                </div>

                                <i class="fa-solid fa-circle-check branch-check"></i>

                            </label>


                            <label class="pickup-branch-card">

                                <input
                                    type="radio"
                                    name="pickup-branch"
                                    value="Branch 2"
                                    data-address="Sadar Chowk, Near Ghanta Ghar, Sheikhupura"
                                >

                                <div class="branch-card-content">

                                    <div class="branch-icon">
                                        <i class="fa-solid fa-store"></i>
                                    </div>

                                    <div class="branch-info">

                                        <strong>
                                            Branch 2
                                        </strong>

                                        <span>
                                            Sadar Chowk, Near Ghanta Ghar, Sheikhupura
                                        </span>

                                    </div>

                                </div>

                                <i class="fa-solid fa-circle-check branch-check"></i>

                            </label>


                            <label class="pickup-branch-card">

                                <input
                                    type="radio"
                                    name="pickup-branch"
                                    value="Branch 3"
                                    data-address="Joiyan Wala Mor, Muridke Road, Sheikhupura"
                                >

                                <div class="branch-card-content">

                                    <div class="branch-icon">
                                        <i class="fa-solid fa-store"></i>
                                    </div>

                                    <div class="branch-info">

                                        <strong>
                                            Branch 3
                                        </strong>

                                        <span>
                                            Joiyan Wala Mor, Muridke Road, Sheikhupura
                                        </span>

                                    </div>

                                </div>

                                <i class="fa-solid fa-circle-check branch-check"></i>

                            </label>

                        </div>

                    `
                    : ""
            }

        </div>


        <div class="checkout-buttons">

            <button
                type="button"
                class="checkout-back-btn"
                onclick="backToCart()"
            >
                <i class="fa-solid fa-arrow-left"></i>
                Back
            </button>


            <button
                type="button"
                class="confirm-order-btn"
                onclick="confirmOrder()"
            >
                <i class="fa-solid fa-check"></i>
                Continue
            </button>

        </div>

    `;
}

/* =========================================================
   CONFIRM CUSTOMER DETAILS
========================================================= */

function confirmOrder() {

    const nameElement =
        document.getElementById("customer-name");

    const phoneElement =
        document.getElementById("customer-phone");

    const emailElement =
        document.getElementById("customer-email");

    const addressElement =
        document.getElementById("customer-address");


    const name =
        nameElement
            ? nameElement.value.trim()
            : "";


    const phone =
        phoneElement
            ? phoneElement.value.trim()
            : "";


    const email =
        emailElement
            ? emailElement.value.trim()
            : "";


    const address =
        addressElement
            ? addressElement.value.trim()
            : "";


    /* NAME */

    if (!name) {

        alert("Please apna naam enter karein.");

        nameElement.focus();

        return;
    }


    /* PHONE */

    if (!phone) {

        alert("Please phone number enter karein.");

        phoneElement.focus();

        return;
    }


    /* EMAIL */

    if (!email) {

        alert("Please email enter karein.");

        emailElement.focus();

        return;
    }


    /* DELIVERY ADDRESS */

    if (
        checkoutData.orderType === "delivery" &&
        !address
    ) {

        alert("Please complete delivery address enter karein.");

        addressElement.focus();

        return;
    }

let pickupBranch = "";
let pickupBranchAddress = "";

if (checkoutData.orderType === "pickup") {

    const selectedBranch =
        document.querySelector(
            'input[name="pickup-branch"]:checked'
        );

    if (!selectedBranch) {

        alert("Please pickup branch select karein.");

        return;
    }

    pickupBranch = selectedBranch.value;

    pickupBranchAddress =
        selectedBranch.dataset.address || "";
}

checkoutData.pickupBranch = pickupBranch;

checkoutData.pickupBranchAddress =
    pickupBranchAddress;

checkoutData.pickupBranch = pickupBranch;

checkoutData.pickupBranchAddress =
    pickupBranchAddress;


    checkoutData.name = name;
    checkoutData.phone = phone;
    checkoutData.email = email;
    checkoutData.address = address;


    showFinalOrder();
}


/* =========================================================
   FINAL ORDER REVIEW
========================================================= */

function showFinalOrder() {

    const content =
        document.getElementById("checkout-content");

    if (!content) return;


    const orderType =
        checkoutData.orderType === "delivery"
            ? "Delivery"
            : "Pickup";


    content.innerHTML = `

        <div class="order-success">

            <div class="success-icon">
                <i class="fa-solid fa-check"></i>
            </div>

            <h3>
                Confirm Your Order
            </h3>

            <p>
                Order place karne se pehle details check karein.
            </p>

        </div>


        <div class="final-order-summary">

            <div class="summary-title">
                Order Summary
            </div>


            ${cart.map(item => {

                const itemTotal =
                    item.price * item.quantity;

                return `

                    <div class="final-item">

                        <span>
                            ${escapeHtml(item.name)}
                            × ${item.quantity}
                        </span>

                        <strong>
                            Rs. ${itemTotal.toLocaleString()}
                        </strong>

                    </div>

                `;

            }).join("")}


            <div class="final-total">

                <span>
                    Total
                </span>

                <strong>
                    Rs. ${getCartTotal().toLocaleString()}
                </strong>

            </div>

        </div>


        <div class="final-customer-details">

            <div>

                <span>
                    Order Type
                </span>

                <strong>
                    ${orderType}
                </strong>

            </div>

            ${
    checkoutData.orderType === "pickup"
        ? `
            <div>

                <span>
                    Pickup Branch
                </span>

                <strong>
                    ${escapeHtml(checkoutData.pickupBranch)}

                    <small style="
                        display:block;
                        margin-top:4px;
                        color:#888;
                        font-size:10px;
                        font-weight:600;
                    ">
                        ${escapeHtml(
                            checkoutData.pickupBranchAddress
                        )}
                    </small>

                </strong>

            </div>
        `
        : ""
}


            <div>

                <span>
                    Name
                </span>

                <strong>
                    ${escapeHtml(checkoutData.name)}
                </strong>

            </div>


            <div>

                <span>
                    Phone
                </span>

                <strong>
                    ${escapeHtml(checkoutData.phone)}
                </strong>

            </div>


            <div>

                <span>
                    Email
                </span>

                <strong>
                    ${escapeHtml(checkoutData.email)}
                </strong>

            </div>


            ${
                checkoutData.orderType === "delivery"
                    ? `

                        <div>

                            <span>
                                Address
                            </span>

                            <strong>
                                ${escapeHtml(
                                    checkoutData.address
                                )}
                            </strong>

                        </div>

                    `
                    : ""
            }

        </div>


        <div class="checkout-buttons">

            <button
                type="button"
                class="checkout-back-btn"
                onclick="showCustomerDetails()"
            >
                <i class="fa-solid fa-arrow-left"></i>
                Back
            </button>


            <button
                type="button"
                class="final-confirm-btn"
                onclick="placeOrder()"
            >
                <i class="fa-solid fa-check-circle"></i>
                Place Order
            </button>

        </div>

    `;
}


/* =========================================================
   PLACE ORDER
   GOOGLE SHEETS ORDER SUBMISSION
========================================================= */

async function placeOrder() {

    if (cart.length === 0) {

        alert("Cart empty hai.");

        closeCheckoutModal();

        return;
    }


    /* =====================================================
       FOOD / DEAL / MEAL
       Example:
       Meal 2 × 2, Meal 11 × 1, Pizza × 1
    ===================================================== */

    const food = cart.map(item => {

        return `${item.name} × ${item.quantity}`;

    }).join(" | ");


    /* =====================================================
       TOTAL AMOUNT
    ===================================================== */

    const amount = getCartTotal();


    /* =====================================================
       ORDER DATA
    ===================================================== */

    const order = {

        orderId:
            "BFC-" +
            Date.now().toString().slice(-8),

        name:
            checkoutData.name,

        number:
            checkoutData.phone,

        email:
            checkoutData.email,

        address:
            checkoutData.orderType === "delivery"
                ? checkoutData.address
                : "",

        type:
            checkoutData.orderType,

        branch:
            checkoutData.orderType === "pickup"
                ? checkoutData.pickupBranch
                : "",

        food:
            food,

        amount:
            amount,

        createdAt:
            new Date().toISOString()
    };


    console.log("BFC ORDER:", order);


    /* =====================================================
       GOOGLE SHEETS
    ===================================================== */

    const googleSheetURL =
        "https://script.google.com/macros/s/AKfycbzNXxOuy9P5RDTCm9q8LCtCCT16rzYit3iRQ-v-IHdk-KucQyUMqtNOkUdNYGfskK3G/exec";


    try {

        await fetch(googleSheetURL, {

            method: "POST",

            mode: "no-cors",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({

                Name:
                    order.name,

                Number:
                    order.number,

                Email:
                    order.email,

                Address:
                    order.address,

                Type:
                    order.type,

                Branch:
                    order.branch,

                Food:
                    order.food,

                Amount:
                    order.amount

            })

        });


        /* =================================================
           SUCCESS
        ================================================= */

        alert(
            "Order successfully place ho gaya! 🎉\n\n" +

            "Order ID: " +
            order.orderId +

            "\n\nFood: " +
            order.food +

            "\nTotal: Rs. " +
            order.amount.toLocaleString()
        );


        /* =================================================
           CLEAR CART
        ================================================= */

        cart = [];

        saveCart();

        updateCartUI();


        closeCheckoutModal();

        closeCartModal();


        /* =================================================
           RESET CHECKOUT
        ================================================= */

        checkoutData = {

            orderType: "",
            name: "",
            phone: "",
            email: "",
            address: "",
            pickupBranch: "",
            pickupBranchAddress: ""

        };


    } catch (error) {

        console.error(
            "Google Sheets Error:",
            error
        );


        alert(
            "Order submit karte waqt problem aa gayi.\n\n" +
            "Please dobara try karein."
        );

    }

}

/* =========================================================
   BACK TO CART
========================================================= */

function backToCart() {

    closeCheckoutModal();

    openCartModal();

}


/* =========================================================
   CLOSE CHECKOUT
========================================================= */

function closeCheckoutModal() {

    const modal =
        document.getElementById("checkout-modal");

    if (modal) {

        modal.classList.remove("active");

    }

}


/* =========================================================
   CHECKOUT OUTSIDE CLICK
========================================================= */

document.addEventListener("click", function(event) {

    const modal =
        document.getElementById("checkout-modal");

    if (
        modal &&
        event.target === modal
    ) {

        closeCheckoutModal();

    }

});

/* =========================================================
   SECURITY HELPER
========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   PIZZA MENU DATA
========================================================= */

const pizzaMenu = [

    {
        name: "Kabab Bite Pizza",
        desc: "Kabab, Chicken Onion, Tomato, Green Pepper, Mushroom, Cheese, Sweet Corn",
        prices: ["-", "1500", "1800", "2500"]
    },

    {
        name: "Star Kabab Pizza",
        desc: "Seekh Kabab, Chicken, Onion, Tomato, Cheese",
        prices: ["-", "1500", "1800", "2500"]
    },

    {
        name: "Donner Pizza",
        desc: "Double Cheese, Chicken, Tomato, Olive, Bell Pepper, Onion, Jalapeno",
        prices: ["-", "1500", "1800", "2500"]
    },

    {
        name: "Lazania Pizza",
        desc: "Double Cheese, Chicken, Tomato, Olive, Bell Pepper, Onion, Jalapeno",
        prices: ["650", "1500", "1800", "2500"]
    },

    {
        name: "Stuff Pizza",
        desc: "Kabab, Cheese, Chicken",
        prices: ["650", "1500", "1800", "2500"]
    },

    {
        name: "Seekh Kabab Pizza",
        desc: "Seekh Kabab, Chicken, Onion, Tomato, Cheese",
        prices: ["650", "1300", "1600", "2300"]
    },

    {
        name: "Malai Boti Pizza",
        desc: "Malai Boti, Chicken, Extra Olives, Onion",
        prices: ["650", "1300", "1600", "2300"]
    },

    {
        name: "Pepperoni Pizza",
        desc: "Chicken, Pepperoni, Cheese",
        prices: ["650", "1300", "1600", "2300"]
    },

    {
        name: "BFC Special Pizza",
        desc: "Chicken, Onion, Bell Pepper, Tomato, Sweet Corn, Olives, Mushroom, Cheese, Sauce",
        prices: ["550", "1050", "1250", "2000"]
    },

    {
        name: "Tikka Pizza",
        desc: "Tikka Chicken, Onion, Tomato, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },

    {
        name: "Fajita Pizza",
        desc: "Fajita Chicken, Onion, Bell Pepper, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },

    {
        name: "Supreme Sausages",
        desc: "Chicken, Sausages, Olives, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },

    {
        name: "Sicilian Pizza",
        desc: "Chicken, Onion, Green Pepper, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },

    {
        name: "Cheese Lover Pizza",
        desc: "Melted Cheese, Sauce",
        prices: ["550", "1050", "1250", "2000"]
    },

    {
        name: "Veggie Pizza",
        desc: "Mushroom, Bell Pepper, Green Pepper, Sweet Corn, Onion, Olives, Tomato, Extra Cheese",
        prices: ["550", "1050", "1250", "2000"]
    }

];


function renderPizzaMenu() {

    const tbody =
        document.getElementById("pizza-table-body");

    if (!tbody) return;

    tbody.innerHTML = pizzaMenu.map((item, index) => {

        const sizes = ["Small", "Medium", "Large", "XL"];

        const priceCells = item.prices.map((price, i) => {

            if (price === "-") {
                return `
                    <td style="text-align:center;color:#fbbf24;font-weight:800;">
                        -
                    </td>
                `;
            }

            return `
                <td
                    onclick="addToCart('${item.name} - ${sizes[i]}', ${price})"
                    style="
                        text-align:center;
                        color:#fbbf24;
                        font-weight:800;
                        cursor:pointer;
                    "
                    title="Click to Add to Cart"
                >
                    ${price}
                </td>
            `;
        }).join("");

        return `
            <tr class="pizza-row">

                <td>${index + 1}</td>

                <td>
                    <strong>${escapeHtml(item.name)}</strong>
                    <div style="color:#666;font-size:10px;margin-top:3px;">
                        ${escapeHtml(item.desc)}
                    </div>
                </td>

                ${priceCells}

            </tr>
        `;

    }).join("");
}


/* =========================================================
   BANNER BURGER IMAGES
========================================================= */

/*
    One researched Zinger image is repeated as individual
    burger tiles so Meal 2 visually contains 5 burgers and
    Meal 3 visually contains 10 burgers.
*/

const zingerImage =
    "https://images.deliveryhero.io/image/fd-pk/products/3282916.jpg";


function createBurgerCollage(containerId, quantity) {

    const container =
        document.getElementById(containerId);

    if (!container) return;

    let html = "";

    for (let i = 0; i < quantity; i++) {

        html += `
            <img
                class="burger-thumb"
                src="${zingerImage}"
                alt="Zinger Burger ${i + 1}"
                loading="lazy"
            >
        `;
    }

    container.innerHTML = html;
}


/* =========================================================
   DEAL SLIDER
========================================================= */

let currentSlide = 0;
let sliderTimer;


function getSlides() {
    return document.querySelectorAll(".deal-slide");
}


function getDots() {
    return document.querySelectorAll(".slider-dots button");
}


function showSlide(index) {

    const slides = getSlides();
    const dots = getDots();

    if (!slides.length) return;

    if (index >= slides.length) {
        index = 0;
    }

    if (index < 0) {
        index = slides.length - 1;
    }

    currentSlide = index;

    slides.forEach((slide, i) => {

        slide.classList.toggle(
            "active",
            i === currentSlide
        );

    });

    dots.forEach((dot, i) => {

        dot.classList.toggle(
            "active",
            i === currentSlide
        );

    });
}


function changeSlide(direction) {

    showSlide(currentSlide + direction);

    restartSlider();
}


function goToSlide(index) {

    showSlide(index);

    restartSlider();
}


function startSlider() {

    clearInterval(sliderTimer);

    sliderTimer = setInterval(() => {

        showSlide(currentSlide + 1);

    }, 5500);
}


function restartSlider() {

    startSlider();
}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function revealElements() {

    const elements =
        document.querySelectorAll(
            ".reveal, .scale-up, .slide-left, .slide-right"
        );

    const windowHeight =
        window.innerHeight;

    elements.forEach(element => {

        const elementTop =
            element.getBoundingClientRect().top;

        if (elementTop < windowHeight - 80) {

            element.classList.add("active");

        }

    });
}


/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

document.addEventListener("click", function(event) {

    const modals = [
        "call-modal",
        "wa-modal",
        "cart-modal"
    ];

    modals.forEach(id => {

        const modal =
            document.getElementById(id);

        if (
            modal &&
            event.target === modal
        ) {

            modal.classList.remove("active");

        }

    });

});


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener("keydown", function(event) {

    if (event.key !== "Escape") return;

    document
        .querySelectorAll(".modal-overlay.active")
        .forEach(modal => {

            modal.classList.remove("active");

        });

    closeMobileMenu();

});


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", function() {

    /* Pizza table */
    renderPizzaMenu();


    /* Burger banner quantities */
    createBurgerCollage(
        "meal2-burgers",
        5
    );

    createBurgerCollage(
        "meal3-burgers",
        10
    );


    /* Cart */
    updateCartUI();


    /* Banner */
    showSlide(0);
    startSlider();


    /* Scroll animation */
    revealElements();

});


window.addEventListener(
    "scroll",
    revealElements,
    { passive: true }
);


window.addEventListener(
    "load",
    revealElements
);