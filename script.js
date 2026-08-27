/* === BFC WEBSITE === */

/* =========================================================
   CONFIGURATION
========================================================= */

const BFC_CONFIG = {
    businessHours: {
        openHour: 11,
        closeHour: 1,
        timezone: "Asia/Karachi"
    },

    currency: "Rs.",
    cartStorageKey: "bfcCart",
    activeOrderStorageKey: "bfcActiveOrder",
    lastOrderFingerprintKey: "bfcLastOrderFingerprint",
    lastOrderTimeKey: "bfcLastOrderTime",

    googleSheetURL:
        "https://script.google.com/macros/s/AKfycbzNXxOuy9P5RDTCm9q8LCtCCT16rzYit3iRQ-v-IHdk-KucQyUMqtNOkUdNYGfskK3G/exec",

    statusCheckInterval: 8000,
    orderSubmitLockTime: 15000
};


/* =========================================================
   GLOBAL STATE
========================================================= */

let cart = loadCart();
let pendingWhatsappMessage = "";
let notificationTimer = null;
let statusPollingTimer = null;
let orderSubmissionInProgress = false;
let currentActiveOrder = loadActiveOrder();
let lastShownOrderStatus = "";
let checkoutData = createEmptyCheckoutData();

let currentSlide = 0;
let sliderTimer = null;
let bfcSearchIndex = [];


/* =========================================================
   STORAGE HELPERS
========================================================= */

function getStorage(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error("Storage read error:", error);
        return null;
    }
}


function setStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error("Storage write error:", error);
        return false;
    }
}


function removeStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Storage remove error:", error);
    }
}


function loadJSON(key, fallback = null) {
    const stored = getStorage(key);

    if (!stored) return fallback;

    try {
        return JSON.parse(stored);
    } catch (error) {
        console.error(`JSON loading error for "${key}":`, error);
        return fallback;
    }
}


function saveJSON(key, value) {
    return setStorage(key, JSON.stringify(value));
}


function loadCart() {
    const parsed = loadJSON(
        BFC_CONFIG.cartStorageKey,
        []
    );

    return Array.isArray(parsed) ? parsed : [];
}


function saveCart() {
    saveJSON(
        BFC_CONFIG.cartStorageKey,
        cart
    );
}


function loadActiveOrder() {
    const order = loadJSON(
        BFC_CONFIG.activeOrderStorageKey
    );

    if (
        !order ||
        !order.orderId ||
        !order.order
    ) {
        return null;
    }

    return order;
}


function saveActiveOrder(order) {
    currentActiveOrder = order;

    saveJSON(
        BFC_CONFIG.activeOrderStorageKey,
        order
    );
}


function clearActiveOrder() {
    currentActiveOrder = null;

    removeStorage(
        BFC_CONFIG.activeOrderStorageKey
    );
}


/* =========================================================
   COMMON HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-PK");
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function createUniqueId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}


function normalizeOrderStatus(status) {
    const value = String(status || "")
        .trim()
        .toLowerCase();

    if (
        [
            "success",
            "successful",
            "completed",
            "complete",
            "confirmed",
            "accepted",
            "approved"
        ].includes(value)
    ) {
        return "Success";
    }

    if (
        [
            "rejected",
            "reject",
            "cancelled",
            "canceled",
            "failed",
            "unavailable",
            "unavailable order"
        ].includes(value)
    ) {
        return "Rejected";
    }

    return "Pending";
}


function removeElement(id) {
    getElement(id)?.remove();
}


function closeModal(id) {
    getElement(id)?.classList.remove("active");
}


function openModal(id) {
    getElement(id)?.classList.add("active");
}


/* =========================================================
   BUSINESS HOURS
========================================================= */

function getPakistanHour() {
    try {
        const parts = new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: BFC_CONFIG.businessHours.timezone,
                hour: "numeric",
                hour12: false
            }
        ).formatToParts(new Date());

        const hour = parts.find(
            part => part.type === "hour"
        );

        return Number(hour?.value || 0);
    } catch (error) {
        console.error(
            "Pakistan time error:",
            error
        );

        return new Date().getHours();
    }
}


function isBusinessOpen() {
    const hour = getPakistanHour();

    return (
        hour >= BFC_CONFIG.businessHours.openHour ||
        hour < BFC_CONFIG.businessHours.closeHour
    );
}


function getBusinessHoursText() {
    return "11:00 AM – 1:00 AM";
}


function ensureBusinessOpen() {
    if (isBusinessOpen()) {
        return true;
    }

    openBusinessHoursModal();
    return false;
}


/* =========================================================
   BUSINESS HOURS MODAL
========================================================= */

function openBusinessHoursModal() {
    const modal = getElement("business-hours-modal");

    if (!modal) {
        showProfessionalAlert(
            "Orders Unavailable",
            `Orders are currently closed. BFC accepts orders from ${getBusinessHoursText()}. Please try again during business hours.`,
            "warning",
            true
        );

        return;
    }

    const title = modal.querySelector(
        "[data-business-hours-title]"
    );

    const text = modal.querySelector(
        "[data-business-hours-text]"
    );

    if (title) {
        title.textContent =
            "Orders Currently Unavailable";
    }

    if (text) {
        text.textContent =
            `BFC is currently closed. Our ordering hours are ${getBusinessHoursText()}. Please try again during business hours.`;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
}


function closeBusinessHoursModal() {
    const modal = getElement(
        "business-hours-modal"
    );

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
}


/* =========================================================
   MOBILE MENU
========================================================= */

function toggleMobileMenu() {
    getElement("mobile-menu")?.classList.toggle("open");
}


function closeMobileMenu() {
    getElement("mobile-menu")?.classList.remove("open");
}


/* =========================================================
   CALL MODAL
========================================================= */

function openCallModal() {
    openModal("call-modal");
}


function closeCallModal() {
    closeModal("call-modal");
}


/* =========================================================
   WHATSAPP
========================================================= */

function openWhatsappModal() {
    openModal("wa-modal");
}


function closeWhatsappModal() {
    closeModal("wa-modal");
}


function openWhatsapp(number) {
    let url = `https://wa.me/${number}`;

    if (pendingWhatsappMessage) {
        url += `?text=${encodeURIComponent(
            pendingWhatsappMessage
        )}`;

        pendingWhatsappMessage = "";
    }

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

    closeWhatsappModal();
}


/* =========================================================
   CART
========================================================= */

function getCartItemCount() {
    return cart.reduce(
        (total, item) =>
            total + Number(item.quantity || 0),
        0
    );
}


function getCartTotal() {
    return cart.reduce(
        (total, item) =>
            total +
            Number(item.price || 0) *
            Number(item.quantity || 0),
        0
    );
}


function findCartItem(name) {
    return cart.find(
        item => item.name === name
    );
}


function addToCart(itemName, price) {
    const name = String(itemName || "").trim();
    const numericPrice = Number(price);

    if (
        !name ||
        !Number.isFinite(numericPrice)
    ) {
        return;
    }

    const existing = findCartItem(name);

    if (existing) {
        existing.quantity =
            Number(existing.quantity || 0) + 1;
    } else {
        cart.push({
            id: createUniqueId(),
            name,
            price: numericPrice,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    showCartNotification(name);
}


function increaseCartItem(index) {
    const item = cart[index];

    if (!item) return;

    item.quantity =
        Number(item.quantity || 0) + 1;

    saveCart();
    updateCartUI();
}


function decreaseCartItem(index) {
    const item = cart[index];

    if (!item) return;

    item.quantity =
        Number(item.quantity || 0) - 1;

    if (item.quantity <= 0) {
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
    if (!cart.length) return;

    if (
        !window.confirm(
            "Are you sure you want to clear your cart?"
        )
    ) {
        return;
    }

    cart = [];

    saveCart();
    updateCartUI();
}


/* =========================================================
   CART UI
========================================================= */

function renderCartItems() {
    const itemsElement =
        getElement("cart-items");

    if (!itemsElement) return;

    itemsElement.innerHTML = cart
        .map((item, index) => {
            const itemTotal =
                Number(item.price || 0) *
                Number(item.quantity || 0);

            return `
                <div class="cart-item">

                    <div>
                        <div class="cart-item-name">
                            ${escapeHtml(item.name)}
                        </div>

                        <div class="cart-item-price">
                            ${BFC_CONFIG.currency}
                            ${formatNumber(item.price)}
                            × ${item.quantity}
                            =
                            ${BFC_CONFIG.currency}
                            ${formatNumber(itemTotal)}
                        </div>
                    </div>

                    <div class="cart-item-controls">

                        <button
                            type="button"
                            class="qty-btn"
                            onclick="decreaseCartItem(${index})"
                        >
                            −
                        </button>

                        <span class="qty-value">
                            ${item.quantity}
                        </span>

                        <button
                            type="button"
                            class="qty-btn"
                            onclick="increaseCartItem(${index})"
                        >
                            +
                        </button>

                        <button
                            type="button"
                            class="remove-item-btn"
                            onclick="removeCartItem(${index})"
                            aria-label="Remove item"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>
                </div>
            `;
        })
        .join("");
}


function updateCartUI() {
    const countElement =
        getElement("cart-count");

    const itemsElement =
        getElement("cart-items");

    const emptyElement =
        getElement("cart-empty");

    const footerElement =
        getElement("cart-footer");

    const totalElement =
        getElement("cart-total-price");

    const count = getCartItemCount();
    const total = getCartTotal();

    if (countElement) {
        countElement.textContent = count;
    }

    if (itemsElement) {
        if (cart.length) {
            emptyElement?.classList.add("hidden");
            footerElement?.classList.remove("hidden");

            renderCartItems();
        } else {
            itemsElement.innerHTML = "";

            emptyElement?.classList.remove("hidden");
            footerElement?.classList.add("hidden");
        }
    }

    if (totalElement) {
        totalElement.textContent =
            `${BFC_CONFIG.currency} ${formatNumber(total)}`;
    }

    renderActiveOrderStatus();
}


/* =========================================================
   CART MODAL
========================================================= */

function openCartModal() {
    updateCartUI();
    openModal("cart-modal");
}


function closeCartModal() {
    closeModal("cart-modal");
}


/* =========================================================
   CART NOTIFICATION
========================================================= */

function showCartNotification(itemName) {
    const notification =
        getElement("cart-notification");

    const text =
        getElement("cart-text");

    if (!notification) return;

    if (text) {
        text.textContent =
            `${itemName} added to your cart.`;
    }

    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {
        notification.classList.remove("show");
    }, 2800);
}


/* =========================================================
   CHECKOUT DATA RESET
========================================================= */

function createEmptyCheckoutData() {
    return {
        orderType: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        pickupBranch: "",
        pickupBranchAddress: ""
    };
}


function resetCheckoutData() {
    checkoutData =
        createEmptyCheckoutData();
}


/* =========================================================
   SELECT ORDER TYPE
========================================================= */

function selectOrderType(type) {
    if (!ensureBusinessOpen()) return;

    if (!cart.length) {
        showProfessionalAlert(
            "Cart Empty",
            "Please add at least one item before placing your order.",
            "warning"
        );

        return;
    }

    if (
        type !== "delivery" &&
        type !== "pickup"
    ) {
        return;
    }

    resetCheckoutData();

    checkoutData.orderType = type;

    createCheckoutModal();
    showCustomerDetails();
}


/* =========================================================
   CHECKOUT MODAL
========================================================= */

function createCheckoutModal() {
    let modal =
        getElement("checkout-modal");

    if (!modal) {
        modal =
            document.createElement("div");

        modal.id = "checkout-modal";
        modal.className = "modal-overlay";

        modal.innerHTML = `
            <div class="modal-box checkout-modal-box">

                <button
                    type="button"
                    class="modal-close"
                    onclick="closeCheckoutModal()"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div id="checkout-content"></div>

            </div>
        `;

        document.body.appendChild(modal);
    }

    modal.classList.add("active");

    return modal;
}


/* =========================================================
   CUSTOMER DETAILS
========================================================= */

function showCustomerDetails() {
    createCheckoutModal();

    const content =
        getElement("checkout-content");

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
                Please enter your details below.
            </p>

        </div>

        <div class="checkout-summary">

            <div>
                <span>Total Items</span>
                <strong>${getCartItemCount()}</strong>
            </div>

            <div>
                <span>Total Bill</span>
                <strong>
                    ${BFC_CONFIG.currency}
                    ${formatNumber(getCartTotal())}
                </strong>
            </div>

        </div>

        <div class="checkout-section-title">
            Customer Information
        </div>

        <div class="checkout-form">

            <div class="checkout-field">

                <label for="customer-name">
                    Full Name *
                </label>

                <input
                    type="text"
                    id="customer-name"
                    name="customerName"
                    placeholder="Enter your full name"
                    autocomplete="name"
                    maxlength="100"
                    value="${escapeHtml(checkoutData.name)}"
                >

            </div>

            <div class="checkout-field">

                <label for="customer-phone">
                    Phone Number *
                </label>

                <input
                    type="tel"
                    id="customer-phone"
                    name="customerPhone"
                    placeholder="03XX XXXXXXX"
                    autocomplete="tel"
                    maxlength="20"
                    value="${escapeHtml(checkoutData.phone)}"
                >

            </div>

            <div class="checkout-field">

                <label for="customer-email">
                    Email
                    <span style="
                        color:#777;
                        font-size:10px;
                    ">
                        (Optional)
                    </span>
                </label>

                <input
                    type="email"
                    id="customer-email"
                    name="customerEmail"
                    placeholder="example@email.com"
                    autocomplete="email"
                    maxlength="150"
                    value="${escapeHtml(checkoutData.email)}"
                >

                <small style="
                    display:block;
                    margin-top:5px;
                    color:#777;
                    font-size:10px;
                ">
                    Email is optional. Your order can be placed without it.
                </small>

            </div>

            ${
                isDelivery
                    ? `
                        <div class="checkout-field">

                            <label for="customer-address">
                                Delivery Address *
                            </label>

                            <textarea
                                id="customer-address"
                                name="customerAddress"
                                rows="3"
                                placeholder="Enter complete delivery address"
                                autocomplete="street-address"
                                maxlength="500"
                            >${escapeHtml(checkoutData.address)}</textarea>

                        </div>
                    `
                    : renderPickupBranches()
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
                onclick="confirmCustomerDetails()"
            >
                Continue
                <i class="fa-solid fa-arrow-right"></i>
            </button>

        </div>
    `;
}


/* =========================================================
   PICKUP BRANCHES
========================================================= */

function renderPickupBranches() {
    return `
        <div class="checkout-section-title pickup-branch-title">
            Select Pickup Branch
        </div>

        <div class="pickup-branches">

            ${getBranches()
                .map(
                    branch => `
                        <label class="pickup-branch-card">

                            <input
                                type="radio"
                                name="pickup-branch"
                                value="${escapeHtml(branch.name)}"
                                data-address="${escapeHtml(branch.address)}"
                                ${
                                    checkoutData.pickupBranch ===
                                    branch.name
                                        ? "checked"
                                        : ""
                                }
                            >

                            <div class="branch-card-content">

                                <div class="branch-icon">
                                    <i class="fa-solid fa-store"></i>
                                </div>

                                <div class="branch-info">

                                    <strong>
                                        ${escapeHtml(branch.name)}
                                    </strong>

                                    <span>
                                        ${escapeHtml(branch.address)}
                                    </span>

                                </div>

                            </div>

                            <i class="fa-solid fa-circle-check branch-check"></i>

                        </label>
                    `
                )
                .join("")}

        </div>
    `;
}


/* =========================================================
   BRANCH DATA
========================================================= */

function getBranches() {
    return [
        {
            name: "Branch 1",
            address:
                "Housing Colony, Main Market, Sheikhupura",
            latitude: 31.7167,
            longitude: 73.9850
        },
        {
            name: "Branch 2",
            address:
                "Sadar Chowk, Near Ghanta Ghar, Sheikhupura",
            latitude: 31.7140,
            longitude: 73.9780
        },
        {
            name: "Branch 3",
            address:
                "Joiyan Wala Mor, Muridke Road, Sheikhupura",
            latitude: 31.7200,
            longitude: 73.9950
        }
    ];
}


/* =========================================================
   CONFIRM CUSTOMER DETAILS
========================================================= */

function confirmCustomerDetails() {
    if (!ensureBusinessOpen()) return;

    const content =
        getElement("checkout-content");

    if (!content) {
        showProfessionalAlert(
            "Checkout Error",
            "Checkout form could not be loaded. Please try again.",
            "error"
        );

        return;
    }

    const nameElement =
        content.querySelector("#customer-name");

    const phoneElement =
        content.querySelector("#customer-phone");

    const emailElement =
        content.querySelector("#customer-email");

    const addressElement =
        content.querySelector("#customer-address");

    const name =
        nameElement?.value?.trim() || "";

    const phone =
        phoneElement?.value?.trim() || "";

    const email =
        emailElement?.value?.trim() || "";

    const address =
        addressElement?.value?.trim() || "";

    if (!name) {
        showProfessionalAlert(
            "Name Required",
            "Please enter your full name.",
            "warning"
        );

        nameElement?.focus();
        return;
    }

    if (!phone) {
        showProfessionalAlert(
            "Phone Number Required",
            "Please enter your phone number.",
            "warning"
        );

        phoneElement?.focus();
        return;
    }

    if (!isValidPhone(phone)) {
        showProfessionalAlert(
            "Invalid Phone Number",
            "Please enter a valid phone number, for example 03001234567.",
            "warning"
        );

        phoneElement?.focus();
        return;
    }

    if (
        email &&
        !isValidEmail(email)
    ) {
        showProfessionalAlert(
            "Invalid Email",
            "Please enter a valid email address or leave it empty.",
            "warning"
        );

        emailElement?.focus();
        return;
    }

    if (
        checkoutData.orderType === "delivery" &&
        !address
    ) {
        showProfessionalAlert(
            "Address Required",
            "Please enter your complete delivery address.",
            "warning"
        );

        addressElement?.focus();
        return;
    }

    let pickupBranch = "";
    let pickupBranchAddress = "";

    if (checkoutData.orderType === "pickup") {
        const selectedBranch =
            content.querySelector(
                'input[name="pickup-branch"]:checked'
            );

        if (!selectedBranch) {
            showProfessionalAlert(
                "Branch Required",
                "Please select your pickup branch.",
                "warning"
            );

            return;
        }

        pickupBranch =
            selectedBranch.value?.trim() || "";

        pickupBranchAddress =
            selectedBranch.dataset.address?.trim() || "";

        if (!pickupBranch) {
            showProfessionalAlert(
                "Branch Required",
                "Please select a valid pickup branch.",
                "warning"
            );

            return;
        }
    }

    Object.assign(
        checkoutData,
        {
            name,
            phone,
            email,
            address,
            pickupBranch,
            pickupBranchAddress
        }
    );

    showFinalOrder();
}


/* =========================================================
   FINAL REVIEW
========================================================= */

function showFinalOrder() {
    const content =
        getElement("checkout-content");

    if (!content) return;

    const isDelivery =
        checkoutData.orderType === "delivery";

    const orderType =
        isDelivery ? "Delivery" : "Pickup";

    content.innerHTML = `
        <div class="order-success">

            <div class="success-icon">
                <i class="fa-solid fa-shield-check"></i>
            </div>

            <h3>
                Review Your Order
            </h3>

            <p>
                Please check your information before placing the order.
            </p>

        </div>

        <div class="final-order-summary">

            <div class="summary-title">
                Order Summary
            </div>

            ${cart
                .map(item => {
                    const itemTotal =
                        Number(item.price || 0) *
                        Number(item.quantity || 0);

                    return `
                        <div class="final-item">

                            <span>
                                ${escapeHtml(item.name)}
                                × ${item.quantity}
                            </span>

                            <strong>
                                ${BFC_CONFIG.currency}
                                ${formatNumber(itemTotal)}
                            </strong>

                        </div>
                    `;
                })
                .join("")}

            <div class="final-total">

                <span>Total</span>

                <strong>
                    ${BFC_CONFIG.currency}
                    ${formatNumber(getCartTotal())}
                </strong>

            </div>

        </div>

        <div class="final-customer-details">

            <div>
                <span>Order Type</span>
                <strong>${orderType}</strong>
            </div>

            ${
                !isDelivery
                    ? `
                        <div>

                            <span>
                                Pickup Branch
                            </span>

                            <strong>
                                ${escapeHtml(
                                    checkoutData.pickupBranch
                                )}

                                <small>
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
                <span>Name</span>
                <strong>
                    ${escapeHtml(checkoutData.name)}
                </strong>
            </div>

            <div>
                <span>Phone</span>
                <strong>
                    ${escapeHtml(checkoutData.phone)}
                </strong>
            </div>

            <div>

                <span>Email</span>

                <strong ${
                    checkoutData.email
                        ? ""
                        : 'style="color:#777;"'
                }>
                    ${
                        checkoutData.email
                            ? escapeHtml(
                                checkoutData.email
                            )
                            : "Not provided"
                    }
                </strong>

            </div>

            ${
                isDelivery
                    ? `
                        <div>

                            <span>Address</span>

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

        <div
            id="submit-order-area"
            class="checkout-buttons"
        >

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
                id="place-order-button"
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
========================================================= */

async function placeOrder() {
    if (!ensureBusinessOpen()) return;

    if (!cart.length) {
        showProfessionalAlert(
            "Cart Empty",
            "There are no items in your cart.",
            "warning"
        );

        closeCheckoutModal();
        return;
    }

    if (orderSubmissionInProgress) {
        showProfessionalAlert(
            "Order Already Processing",
            "Your order is already being submitted. Please wait.",
            "info"
        );

        return;
    }

    const submitButton =
        getElement("place-order-button");

    orderSubmissionInProgress = true;

    setSubmitButtonState(
        submitButton,
        true
    );

    try {
        const fingerprint =
            createOrderFingerprint();

        if (isRecentDuplicateOrder(fingerprint)) {
            showProfessionalAlert(
                "Duplicate Order Prevented",
                "The same order is already being processed.",
                "info"
            );

            return;
        }

        saveOrderSubmissionLock(fingerprint);

        const order =
            buildOrderObject();

        saveActiveOrder({
            orderId: order.orderId,
            status: "Pending",
            createdAt: order.createdAt,
            order
        });

        lastShownOrderStatus = "Pending";
        renderActiveOrderStatus();

        await submitOrderToGoogleSheet(order);

        cart = [];

        saveCart();
        updateCartUI();

        closeCheckoutModal();
        closeCartModal();

        showOrderStatusModal(
            order,
            "Pending"
        );

        startOrderStatusPolling(
            order.orderId
        );

    } catch (error) {
        console.error(
            "Order submission failed:",
            error
        );

        clearActiveOrder();
        stopOrderStatusPolling();

        showProfessionalAlert(
            "Order Submission Failed",
            "We could not submit your order. Please try again.",
            "error"
        );
    } finally {
        orderSubmissionInProgress = false;

        setSubmitButtonState(
            submitButton,
            false
        );
    }
}


function setSubmitButtonState(
    button,
    loading
) {
    if (!button) return;

    button.disabled = loading;

    button.innerHTML = loading
        ? `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Processing...
        `
        : `
            <i class="fa-solid fa-check-circle"></i>
            Place Order
        `;
}


function isRecentDuplicateOrder(fingerprint) {
    const previousFingerprint =
        getStorage(
            BFC_CONFIG.lastOrderFingerprintKey
        );

    const previousTime =
        Number(
            getStorage(
                BFC_CONFIG.lastOrderTimeKey
            ) || 0
        );

    return (
        previousFingerprint === fingerprint &&
        Date.now() - previousTime <
            BFC_CONFIG.orderSubmitLockTime
    );
}


function saveOrderSubmissionLock(fingerprint) {
    setStorage(
        BFC_CONFIG.lastOrderFingerprintKey,
        fingerprint
    );

    setStorage(
        BFC_CONFIG.lastOrderTimeKey,
        String(Date.now())
    );
}


/* =========================================================
   BUILD ORDER
========================================================= */

function buildOrderObject() {
    const food = cart
        .map(
            item =>
                `${item.name} × ${item.quantity}`
        )
        .join(" | ");

    return {
        orderId: generateOrderId(),

        name: checkoutData.name,

        number: checkoutData.phone,

        email: checkoutData.email || "",

        address:
            checkoutData.orderType === "delivery"
                ? checkoutData.address
                : "",

        type: checkoutData.orderType,

        branch:
            checkoutData.orderType === "pickup"
                ? checkoutData.pickupBranch
                : getDeliveryBranch(),

        branchAddress:
            checkoutData.orderType === "pickup"
                ? checkoutData.pickupBranchAddress
                : "",

        food,

        amount: getCartTotal(),

        status: "Pending",

        createdAt: new Date().toISOString()
    };
}


/* =========================================================
   GENERATE ORDER ID
========================================================= */

function generateOrderId() {
    const random =
        Math.floor(
            1000 + Math.random() * 9000
        );

    const time =
        Date.now()
            .toString()
            .slice(-6);

    return `BFC-${time}${random}`;
}


/* =========================================================
   ORDER FINGERPRINT
========================================================= */

function createOrderFingerprint() {
    return JSON.stringify({
        cart: cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),

        name:
            checkoutData.name
                .toLowerCase()
                .trim(),

        phone:
            checkoutData.phone.replace(
                /[\s\-()+]/g,
                ""
            ),

        type:
            checkoutData.orderType,

        address:
            checkoutData.address
                .toLowerCase()
                .trim(),

        branch:
            checkoutData.pickupBranch
    });
}


/* =========================================================
   GOOGLE SHEET SUBMISSION
========================================================= */

async function submitOrderToGoogleSheet(order) {
    const payload = {
        OrderID: order.orderId,
        Name: order.name,
        Phone: order.number,
        Email: order.email,
        Address: order.address,
        OrderType: order.type,
        Branch: order.branch,
        BranchAddress: order.branchAddress,
        Food: order.food,
        Amount: order.amount,
        Status: "Pending",
        CreatedAt: order.createdAt
    };

    console.log("BFC ORDER:", payload);

    await fetch(
        BFC_CONFIG.googleSheetURL,
        {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type":
                    "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload)
        }
    );
}


/* =========================================================
   ORDER STATUS POLLING
========================================================= */

function startOrderStatusPolling(orderId) {
    if (!orderId) return;

    stopOrderStatusPolling();

    checkOrderStatus(orderId);

    statusPollingTimer =
        setInterval(
            () => checkOrderStatus(orderId),
            BFC_CONFIG.statusCheckInterval
        );
}


function stopOrderStatusPolling() {
    if (!statusPollingTimer) return;

    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
}


/* =========================================================
   CHECK ORDER STATUS
========================================================= */

async function checkOrderStatus(orderId) {
    if (!orderId) return;

    try {
        const url =
            `${BFC_CONFIG.googleSheetURL}` +
            `?action=status` +
            `&orderId=${encodeURIComponent(orderId)}` +
            `&_=${Date.now()}`;

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            console.warn(
                "Status HTTP error:",
                response.status
            );

            return;
        }

        const data =
            await response.json();

        console.log(
            "BFC STATUS RESPONSE:",
            data
        );

        if (!data?.status) return;

        const status =
            normalizeOrderStatus(
                data.status
            );

        if (
            currentActiveOrder &&
            currentActiveOrder.status !== status
        ) {
            updateActiveOrderStatus(status);
        }

        if (
            status === "Success" ||
            status === "Rejected"
        ) {
            stopOrderStatusPolling();
        }
    } catch (error) {
        console.warn(
            "Order status check failed:",
            error
        );
    }
}


/* =========================================================
   UPDATE ACTIVE ORDER STATUS
========================================================= */

function updateActiveOrderStatus(status) {
    if (!currentActiveOrder) return;

    const oldStatus =
        normalizeOrderStatus(
            currentActiveOrder.status
        );

    const newStatus =
        normalizeOrderStatus(status);

    currentActiveOrder.status = newStatus;

    saveActiveOrder(
        currentActiveOrder
    );

    renderActiveOrderStatus();

    if (
        (
            newStatus === "Success" ||
            newStatus === "Rejected"
        ) &&
        oldStatus !== newStatus
    ) {
        lastShownOrderStatus = newStatus;

        showOrderStatusModal(
            currentActiveOrder.order,
            newStatus
        );
    }
}


/* =========================================================
   CART ACTIVE ORDER
========================================================= */

function renderActiveOrderStatus() {
    const container =
        getElement("active-order-status");

    if (!container) return;

    if (!currentActiveOrder) {
        container.classList.add("hidden");
        container.innerHTML = "";
        return;
    }

    const status =
        normalizeOrderStatus(
            currentActiveOrder.status
        );

    const statusClass =
        status.toLowerCase();

    const statusText =
        status === "Success"
            ? "Order Successful"
            : status === "Rejected"
                ? "Order Rejected"
                : "Order Pending";

    const message =
        status === "Success"
            ? "Your order has been confirmed."
            : status === "Rejected"
                ? "This order was rejected."
                : "Your order is waiting for confirmation.";

    container.className =
        `active-order-status ${statusClass}`;

    container.innerHTML = `
        <div class="active-order-top">

            <span class="active-order-id">
                ${escapeHtml(
                    currentActiveOrder.orderId
                )}
            </span>

            <span
                class="order-status-pill ${statusClass}"
            >
                ${statusText}
            </span>

        </div>

        <div class="active-order-message">
            ${escapeHtml(message)}
        </div>

        <button
            type="button"
            onclick="showSavedOrderStatus()"
            style="
                margin-top:9px;
                border:0;
                background:transparent;
                color:#fbbf24;
                padding:0;
                cursor:pointer;
                font-size:10px;
                font-weight:800;
            "
        >
            View Order Status
        </button>
    `;
}


/* =========================================================
   SHOW SAVED ORDER
========================================================= */

function showSavedOrderStatus() {
    if (!currentActiveOrder) return;

    showOrderStatusModal(
        currentActiveOrder.order,
        currentActiveOrder.status
    );
}


/* =========================================================
   ORDER STATUS MODAL
========================================================= */

function showOrderStatusModal(order, status) {
    const modal =
        getElement("order-status-modal");

    const content =
        getElement("order-status-content");

    if (!modal || !content) {
        showProfessionalOrderStatusFallback(
            order,
            status
        );

        return;
    }

    status =
        normalizeOrderStatus(status);

    const isSuccess =
        status === "Success";

    const isRejected =
        status === "Rejected";

    const icon =
        isSuccess
            ? "fa-circle-check"
            : isRejected
                ? "fa-circle-xmark"
                : "fa-clock";

    const title =
        isSuccess
            ? "Order Confirmed"
            : isRejected
                ? "Order Unavailable"
                : "Order Pending";

    const description =
        isSuccess
            ? "Your order has been successfully confirmed by BFC."
            : isRejected
                ? "Unfortunately, this order could not be confirmed at this time."
                : "Your order has been received and is waiting for confirmation.";

    const orderId =
        order?.orderId ||
        currentActiveOrder?.orderId ||
        "";

    content.innerHTML = `
        <div class="order-status-hero">

            <div
                class="order-status-icon ${status.toLowerCase()}"
            >
                <i class="fa-solid ${icon}"></i>
            </div>

            <h3>${title}</h3>

            <p>${description}</p>

        </div>

        <div class="order-id-box">

            <span>Order ID</span>

            <strong>
                ${escapeHtml(orderId)}
            </strong>

        </div>

        <div class="status-progress">

            <div class="status-step active">

                <div class="status-step-icon">
                    <i class="fa-solid fa-paper-plane"></i>
                </div>

                <span>Received</span>

            </div>

            <div
                class="status-line ${
                    status !== "Rejected"
                        ? "active"
                        : ""
                }"
            ></div>

            <div
                class="status-step ${
                    status !== "Rejected"
                        ? "active"
                        : ""
                }"
            >

                <div class="status-step-icon">

                    <i class="fa-solid ${
                        status === "Rejected"
                            ? "fa-xmark"
                            : status === "Success"
                                ? "fa-check"
                                : "fa-clock"
                    }"></i>

                </div>

                <span>
                    ${
                        status === "Rejected"
                            ? "Unavailable"
                            : status === "Success"
                                ? "Success"
                                : "Pending"
                    }
                </span>

            </div>

        </div>

        <div
            class="order-status-details"
            style="
                margin-top:20px;
                padding:15px;
                border-radius:14px;
                background:rgba(255,255,255,.04);
            "
        >

            ${renderStatusDetail(
                "Customer",
                order?.name || ""
            )}

            ${renderStatusDetail(
                "Order Type",
                order?.type === "delivery"
                    ? "Delivery"
                    : "Pickup"
            )}

            ${renderStatusDetail(
                "Total",
                `${BFC_CONFIG.currency} ${formatNumber(
                    order?.amount || 0
                )}`,
                true
            )}

        </div>

        <button
            type="button"
            onclick="closeOrderStatusModal()"
            style="
                width:100%;
                margin-top:18px;
                padding:13px;
                border:0;
                border-radius:12px;
                background:#fbbf24;
                color:#111;
                font-weight:900;
                cursor:pointer;
            "
        >
            Done
        </button>
    `;

    modal.classList.add("active");

    if (
        status === "Pending" &&
        order?.orderId
    ) {
        startOrderStatusPolling(
            order.orderId
        );
    }
}


function renderStatusDetail(
    label,
    value,
    highlight = false
) {
    return `
        <div style="
            display:flex;
            justify-content:space-between;
            gap:15px;
            padding:7px 0;
        ">

            <span style="color:#888;">
                ${escapeHtml(label)}
            </span>

            <strong style="
                color:${highlight ? "#fbbf24" : "#fff"};
            ">
                ${escapeHtml(value)}
            </strong>

        </div>
    `;
}


/* =========================================================
   FALLBACK ORDER STATUS POPUP
========================================================= */

function showProfessionalOrderStatusFallback(
    order,
    status
) {
    removeElement(
        "bfc-order-status-fallback"
    );

    status =
        normalizeOrderStatus(status);

    const success =
        status === "Success";

    const rejected =
        status === "Rejected";

    const color =
        success
            ? "#22c55e"
            : rejected
                ? "#ef4444"
                : "#fbbf24";

    const icon =
        success
            ? "fa-circle-check"
            : rejected
                ? "fa-circle-xmark"
                : "fa-clock";

    const title =
        success
            ? "Order Confirmed"
            : rejected
                ? "Order Unavailable"
                : "Order Pending";

    const message =
        success
            ? "Your order has been successfully confirmed by BFC."
            : rejected
                ? "Unfortunately, this order could not be confirmed at this time."
                : "Your order has been received and is waiting for confirmation.";

    const modal =
        document.createElement("div");

    modal.id =
        "bfc-order-status-fallback";

    modal.className =
        "modal-overlay";

    modal.innerHTML = `
        <div
            class="modal-box"
            style="
                max-width:430px;
                text-align:center;
                padding:32px;
            "
        >

            <div
                style="
                    width:72px;
                    height:72px;
                    margin:0 auto 18px;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:${color}18;
                    color:${color};
                    font-size:34px;
                    box-shadow:0 0 35px ${color}18;
                "
            >
                <i class="fa-solid ${icon}"></i>
            </div>

            <h3 style="
                margin:0 0 9px;
                color:#fff;
                font-size:22px;
                font-weight:900;
            ">
                ${title}
            </h3>

            <p style="
                margin:0;
                color:#999;
                font-size:13px;
                line-height:1.6;
            ">
                ${message}
            </p>

            <div style="
                margin-top:20px;
                padding:13px;
                border-radius:12px;
                background:rgba(255,255,255,.05);
            ">

                <span style="
                    display:block;
                    color:#888;
                    font-size:10px;
                    margin-bottom:5px;
                ">
                    Order ID
                </span>

                <strong style="
                    color:#fbbf24;
                    font-size:15px;
                ">
                    ${escapeHtml(
                        order?.orderId ||
                        currentActiveOrder?.orderId ||
                        ""
                    )}
                </strong>

            </div>

            <button
                type="button"
                onclick="removeElement('bfc-order-status-fallback')"
                style="
                    width:100%;
                    margin-top:20px;
                    padding:13px;
                    border:0;
                    border-radius:12px;
                    background:#fbbf24;
                    color:#111;
                    font-weight:900;
                    cursor:pointer;
                "
            >
                Done
            </button>

        </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
        modal.classList.add("active");
    });
}


/* =========================================================
   CLOSE ORDER STATUS MODAL
========================================================= */

function closeOrderStatusModal() {
    closeModal("order-status-modal");
    removeElement(
        "bfc-order-status-fallback"
    );
}


/* =========================================================
   CLOSE CHECKOUT
========================================================= */

function closeCheckoutModal() {
    closeModal("checkout-modal");
}


/* =========================================================
   BACK TO CART
========================================================= */

function backToCart() {
    closeCheckoutModal();
    openCartModal();
}


/* =========================================================
   DELIVERY BRANCH
========================================================= */

function getDeliveryBranch() {
    return (
        getBranches()[0]?.name ||
        "Branch 1"
    );
}


/* =========================================================
   VALIDATION
========================================================= */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}


function isValidPhone(phone) {
    const cleaned =
        String(phone || "")
            .replace(
                /[\s\-()+]/g,
                ""
            );

    return /^\d{10,15}$/.test(cleaned);
}


/* =========================================================
   PROFESSIONAL ALERT
========================================================= */

function showProfessionalAlert(
    title,
    message,
    type = "info",
    heavy = false
) {
    removeElement("bfc-alert-modal");

    const icon =
        type === "error"
            ? "fa-circle-xmark"
            : type === "warning"
                ? "fa-triangle-exclamation"
                : "fa-circle-info";

    const color =
        type === "error"
            ? "#f87171"
            : type === "warning"
                ? "#fbbf24"
                : "#60a5fa";

    const modal =
        document.createElement("div");

    modal.id =
        "bfc-alert-modal";

    modal.className =
        "modal-overlay";

    modal.innerHTML = `
        <div
            class="modal-box"
            style="
                max-width:${heavy ? "460px" : "420px"};
                text-align:center;
                padding:${heavy ? "36px 30px" : "30px"};
                ${
                    heavy
                        ? "box-shadow:0 0 50px rgba(251,191,36,.16);"
                        : ""
                }
            "
        >

            <div
                style="
                    width:${heavy ? "76px" : "62px"};
                    height:${heavy ? "76px" : "62px"};
                    margin:0 auto 15px;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:${color}18;
                    color:${color};
                    font-size:${heavy ? "32px" : "27px"};
                "
            >
                <i class="fa-solid ${icon}"></i>
            </div>

            <h3 style="
                margin:0 0 9px;
                color:#fff;
                font-size:${heavy ? "21px" : "18px"};
                font-weight:900;
            ">
                ${escapeHtml(title)}
            </h3>

            <p style="
                margin:0;
                color:#999;
                font-size:13px;
                line-height:1.65;
            ">
                ${escapeHtml(message)}
            </p>

            ${
                heavy
                    ? `
                        <div style="
                            margin-top:18px;
                            padding:13px;
                            border-radius:12px;
                            background:rgba(251,191,36,.06);
                            border:1px solid rgba(251,191,36,.12);
                            color:#bbb;
                            font-size:11px;
                            line-height:1.6;
                        ">

                            <strong style="
                                color:#fbbf24;
                                display:block;
                                margin-bottom:3px;
                            ">
                                BFC Ordering Hours
                            </strong>

                            ${escapeHtml(
                                getBusinessHoursText()
                            )}

                        </div>
                    `
                    : ""
            }

            <button
                type="button"
                onclick="removeElement('bfc-alert-modal')"
                style="
                    width:100%;
                    margin-top:22px;
                    padding:13px;
                    border:0;
                    border-radius:11px;
                    background:${color};
                    color:#111;
                    font-weight:900;
                    cursor:pointer;
                "
            >
                OK
            </button>

        </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
        modal.classList.add("active");
    });
}


/* =========================================================
   PIZZA MENU
========================================================= */

const pizzaMenu = [
    {
        name: "Kabab Bite Pizza",
        desc:
            "Kabab, Chicken Onion, Tomato, Green Pepper, Mushroom, Cheese, Sweet Corn",
        prices: ["-", "1500", "1800", "2500"]
    },
    {
        name: "Star Kabab Pizza",
        desc:
            "Seekh Kabab, Chicken, Onion, Tomato, Cheese",
        prices: ["-", "1500", "1800", "2500"]
    },
    {
        name: "Donner Pizza",
        desc:
            "Double Cheese, Chicken, Tomato, Olive, Bell Pepper, Onion, Jalapeno",
        prices: ["-", "1500", "1800", "2500"]
    },
    {
        name: "Lazania Pizza",
        desc:
            "Double Cheese, Chicken, Tomato, Olive, Bell Pepper, Onion, Jalapeno",
        prices: ["650", "1500", "1800", "2500"]
    },
    {
        name: "Stuff Pizza",
        desc:
            "Kabab, Cheese, Chicken",
        prices: ["650", "1500", "1800", "2500"]
    },
    {
        name: "Seekh Kabab Pizza",
        desc:
            "Seekh Kabab, Chicken, Onion, Tomato, Cheese",
        prices: ["650", "1300", "1600", "2300"]
    },
    {
        name: "Malai Boti Pizza",
        desc:
            "Malai Boti, Chicken, Extra Olives, Onion",
        prices: ["650", "1300", "1600", "2300"]
    },
    {
        name: "Pepperoni Pizza",
        desc:
            "Chicken, Pepperoni, Cheese",
        prices: ["650", "1300", "1600", "2300"]
    },
    {
        name: "BFC Special Pizza",
        desc:
            "Chicken, Onion, Bell Pepper, Tomato, Sweet Corn, Olives, Mushroom, Cheese, Sauce",
        prices: ["550", "1050", "1250", "2000"]
    },
    {
        name: "Tikka Pizza",
        desc:
            "Tikka Chicken, Onion, Tomato, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },
    {
        name: "Fajita Pizza",
        desc:
            "Fajita Chicken, Onion, Bell Pepper, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },
    {
        name: "Supreme Sausages",
        desc:
            "Chicken, Sausages, Olives, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },
    {
        name: "Sicilian Pizza",
        desc:
            "Chicken, Onion, Green Pepper, Cheese",
        prices: ["550", "1050", "1250", "2000"]
    },
    {
        name: "Cheese Lover Pizza",
        desc:
            "Melted Cheese, Sauce",
        prices: ["550", "1050", "1250", "2000"]
    },
    {
        name: "Veggie Pizza",
        desc:
            "Mushroom, Bell Pepper, Green Pepper, Sweet Corn, Onion, Olives, Tomato, Extra Cheese",
        prices: ["550", "1050", "1250", "2000"]
    }
];


const pizzaSizes = [
    {
        name: "Small",
        label: '8"'
    },
    {
        name: "Medium",
        label: '11"'
    },
    {
        name: "Large",
        label: '14"'
    },
    {
        name: "XL",
        label: '18"'
    }
];


function renderPizzaMenu() {
    const tbody =
        getElement("pizza-table-body");

    if (!tbody) return;

    tbody.innerHTML =
        pizzaMenu
            .map((item, index) => {
                const priceCells =
                    item.prices
                        .map(price =>
                            price === "-"
                                ? `
                                    <td class="pizza-unavailable">
                                        —
                                    </td>
                                `
                                : `
                                    <td class="pizza-price-cell">
                                        Rs.
                                        ${formatNumber(price)}
                                    </td>
                                `
                        )
                        .join("");

                return `
                    <tr
                        class="pizza-row"
                        data-pizza-index="${index}"
                        onclick="openPizzaSizeModal(${index})"
                    >

                        <td class="pizza-number">
                            ${index + 1}
                        </td>

                        <td class="pizza-name-cell">

                            <strong>
                                ${escapeHtml(item.name)}
                            </strong>

                            <div class="pizza-description">
                                ${escapeHtml(item.desc)}
                            </div>

                        </td>

                        ${priceCells}

                        <td class="pizza-order-cell">

                            <button
                                type="button"
                                class="pizza-select-btn"
                                onclick="event.stopPropagation(); openPizzaSizeModal(${index})"
                            >
                                <i class="fa-solid fa-cart-plus"></i>
                                Select
                            </button>

                        </td>

                    </tr>
                `;
            })
            .join("");
}


/* =========================================================
   PIZZA SIZE MODAL
========================================================= */

function openPizzaSizeModal(index) {
    const pizza =
        pizzaMenu[index];

    if (!pizza) return;

    let modal =
        getElement("pizza-size-modal");

    if (!modal) {
        modal =
            document.createElement("div");

        modal.id =
            "pizza-size-modal";

        modal.className =
            "modal-overlay";

        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-box pizza-size-modal-box">

            <button
                type="button"
                class="modal-close"
                onclick="closePizzaSizeModal()"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="pizza-select-header">

                <div class="pizza-select-icon">
                    🍕
                </div>

                <div>

                    <h3>
                        ${escapeHtml(pizza.name)}
                    </h3>

                    <p>
                        Select your preferred size
                    </p>

                </div>

            </div>

            <div class="pizza-select-description">
                ${escapeHtml(pizza.desc)}
            </div>

            <div class="pizza-size-list">

                ${pizzaSizes
                    .map((size, sizeIndex) => {
                        const price =
                            pizza.prices[sizeIndex];

                        if (price === "-") {
                            return `
                                <div
                                    class="pizza-size-option unavailable"
                                >

                                    <div>
                                        <strong>
                                            ${size.name}
                                        </strong>

                                        <span>
                                            ${size.label}
                                        </span>
                                    </div>

                                    <span class="not-available">
                                        Not Available
                                    </span>

                                </div>
                            `;
                        }

                        return `
                            <button
                                type="button"
                                class="pizza-size-option"
                                onclick="addPizzaSizeToCart(${index}, ${sizeIndex})"
                            >

                                <div class="pizza-size-info">

                                    <strong>
                                        ${size.name}
                                    </strong>

                                    <span>
                                        ${size.label}
                                    </span>

                                </div>

                                <div class="pizza-size-price">

                                    <strong>
                                        Rs.
                                        ${formatNumber(price)}
                                    </strong>

                                    <span>
                                        Add to Cart
                                        <i class="fa-solid fa-plus"></i>
                                    </span>

                                </div>

                            </button>
                        `;
                    })
                    .join("")}

            </div>

            <div class="pizza-select-note">

                <i class="fa-solid fa-circle-info"></i>

                Select a size to add the pizza to your cart.

            </div>

        </div>
    `;

    modal.classList.add("active");
}


function addPizzaSizeToCart(
    pizzaIndex,
    sizeIndex
) {
    const pizza =
        pizzaMenu[pizzaIndex];

    const size =
        pizzaSizes[sizeIndex];

    if (!pizza || !size) return;

    const price =
        pizza.prices[sizeIndex];

    if (price === "-") return;

    addToCart(
        `${pizza.name} - ${size.name}`,
        Number(price)
    );

    closePizzaSizeModal();
}


function closePizzaSizeModal() {
    closeModal("pizza-size-modal");
}


/* =========================================================
   DEAL SLIDER
========================================================= */

function getSlides() {
    return document.querySelectorAll(
        ".deal-slide"
    );
}


function getDots() {
    return document.querySelectorAll(
        ".slider-dots button"
    );
}


function showSlide(index) {
    const slides =
        getSlides();

    const dots =
        getDots();

    if (!slides.length) return;

    if (index >= slides.length) {
        index = 0;
    }

    if (index < 0) {
        index = slides.length - 1;
    }

    currentSlide = index;

    slides.forEach(
        (slide, i) => {
            slide.classList.toggle(
                "active",
                i === currentSlide
            );
        }
    );

    dots.forEach(
        (dot, i) => {
            dot.classList.toggle(
                "active",
                i === currentSlide
            );
        }
    );
}


function changeSlide(direction) {
    showSlide(
        currentSlide + direction
    );

    restartSlider();
}


function goToSlide(index) {
    showSlide(index);
    restartSlider();
}


function startSlider() {
    clearInterval(sliderTimer);

    sliderTimer =
        setInterval(
            () =>
                showSlide(
                    currentSlide + 1
                ),
            5500
        );
}


function restartSlider() {
    startSlider();
}


/* =========================================================
   BURGER COLLAGE
========================================================= */

const zingerImage =
    "https://images.deliveryhero.io/image/fd-pk/products/3282916.jpg";


function createBurgerCollage(
    containerId,
    quantity
) {
    const container =
        getElement(containerId);

    if (!container) return;

    container.innerHTML =
        Array.from(
            { length: quantity },
            (_, index) => `
                <img
                    class="burger-thumb"
                    src="${zingerImage}"
                    alt="Zinger Burger ${index + 1}"
                    loading="lazy"
                >
            `
        ).join("");
}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function revealElements() {
    const elements = document.querySelectorAll(
        ".reveal, .scale-up, .slide-left, .slide-right"
    );

    const observerOptions = {
        root: null,
        // rootMargin ko thora barha diya hai taake screen me enter hone se thora PEHLE hi animation start ho jaye, is se lag feel nahi hota
        rootMargin: "0px 0px -5% 0px", 
        threshold: 0.02 // Jaise hi 2% element enter ho, smoothly run ho jaye
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    elements.forEach(element => {
        observer.observe(element);
    });
}



/* =========================================================
   SEARCH
========================================================= */

function addSearchEntry(
    element,
    name,
    description,
    category,
    price,
    addButton = null
) {
    if (!name) return;

    bfcSearchIndex.push({
        name,
        description: description || "",
        category,
        price: price || "",
        element,
        addButton
    });
}


function buildSearchIndex() {
    bfcSearchIndex = [];

    document
        .querySelectorAll(".meal-card")
        .forEach(card => {
            addSearchEntry(
                card,
                card
                    .querySelector("h3")
                    ?.innerText
                    .trim(),
                card
                    .querySelector("p")
                    ?.innerText
                    .trim(),
                "Mega Meal",
                card
                    .querySelector(
                        ".meal-card-bottom span"
                    )
                    ?.innerText
                    .trim(),
                card.querySelector(
                    "button[onclick*='addToCart']"
                )
            );
        });

    document
        .querySelectorAll(".mini-card")
        .forEach(card => {
            addSearchEntry(
                card,
                card
                    .querySelector("strong")
                    ?.innerText
                    .trim(),
                "Special Pizza",
                "Special Pizza",
                card
                    .querySelector("span")
                    ?.innerText
                    .trim(),
                card
            );
        });

    document
        .querySelectorAll(".combo-card")
        .forEach(card => {
            addSearchEntry(
                card,
                card
                    .querySelector("h4")
                    ?.innerText
                    .trim(),
                card
                    .querySelector("p")
                    ?.innerText
                    .trim(),
                "Pizza Combo",
                card
                    .querySelector("strong")
                    ?.innerText
                    .trim(),
                card.querySelector(
                    "button[onclick*='addToCart']"
                )
            );
        });

    document
        .querySelectorAll(".menu-item")
        .forEach(card => {
            addSearchEntry(
                card,
                card
                    .querySelector("h4")
                    ?.innerText
                    .trim(),
                card
                    .querySelector("p")
                    ?.innerText
                    .trim(),
                "Menu",
                card
                    .querySelector(":scope > span")
                    ?.innerText
                    .trim(),
                card.querySelector(
                    "button[onclick*='addToCart']"
                )
            );
        });

    document
        .querySelectorAll(".roll-card")
        .forEach(card => {
            addSearchEntry(
                card,
                card
                    .querySelector("strong")
                    ?.innerText
                    .trim(),
                "Rolls & Shawarma",
                "Shawarma & Rolls",
                card
                    .querySelector("span")
                    ?.innerText
                    .trim(),
                card.querySelector(
                    "button[onclick*='addToCart']"
                )
            );
        });

    document
        .querySelectorAll(".pizza-row")
        .forEach(row => {
            addSearchEntry(
                row,
                row
                    .querySelector(
                        "td:nth-child(2) strong"
                    )
                    ?.innerText
                    .trim(),
                row
                    .querySelector(
                        "td:nth-child(2) div"
                    )
                    ?.innerText
                    .trim(),
                "Pizza",
                "Multiple Sizes"
            );
        });
}


function getSearchMatches(query) {
    const normalized =
        query
            .trim()
            .toLowerCase();

    return bfcSearchIndex.filter(item => {
        const text = `
            ${item.name}
            ${item.description}
            ${item.category}
        `.toLowerCase();

        return text.includes(normalized);
    });
}


function openSearchModal() {
    const modal =
        getElement("search-modal");

    const input =
        getElement("menu-search-input");

    if (!modal) return;

    buildSearchIndex();

    modal.classList.add("active");

    setTimeout(
        () => input?.focus(),
        150
    );
}


function closeSearchModal() {
    const modal =
        getElement("search-modal");

    if (!modal) return;

    modal.classList.remove("active");

    clearMenuSearch();
}


function searchMenu(query) {
    const results =
        getElement("search-results");

    const clearButton =
        getElement("clear-search-btn");

    if (!results) return;

    query =
        query
            .trim()
            .toLowerCase();

    if (clearButton) {
        clearButton.style.display =
            query ? "block" : "none";
    }

    if (!query) {
        results.innerHTML =
            getDefaultSearchMessage();

        return;
    }

    const matches =
        getSearchMatches(query);

    if (!matches.length) {
        results.innerHTML = `
            <div class="search-no-results">

                <i class="fa-solid fa-face-frown"></i>

                <p>
                    No item found for
                    "<strong>${escapeHtml(query)}</strong>"
                </p>

            </div>
        `;

        return;
    }

    results.innerHTML =
        matches
            .map(
                (item, index) => `
                    <div class="search-result-item">

                        <div class="search-result-info">

                            <span class="search-result-category">
                                ${escapeHtml(item.category)}
                            </span>

                            <div class="search-result-name">
                                ${escapeHtml(item.name)}
                            </div>

                            ${
                                item.description
                                    ? `
                                        <div class="search-result-description">
                                            ${escapeHtml(
                                                item.description
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                            ${
                                item.price
                                    ? `
                                        <div style="
                                            color:#fbbf24;
                                            font-size:11px;
                                            font-weight:800;
                                            margin-top:5px;
                                        ">
                                            ${escapeHtml(
                                                item.price
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                        <div class="search-result-actions">

                            <button
                                type="button"
                                class="search-view-btn"
                                onclick="viewSearchResult(
                                    ${index},
                                    '${encodeURIComponent(query)}'
                                )"
                            >
                                View
                            </button>

                            ${
                                item.addButton
                                    ? `
                                        <button
                                            type="button"
                                            class="search-add-btn"
                                            onclick="addSearchResultToCart(
                                                ${index},
                                                '${encodeURIComponent(query)}'
                                            )"
                                        >
                                            Add
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>
                `
            )
            .join("");
}


function getDefaultSearchMessage() {
    return `
        <div class="search-default-message">

            <i class="fa-solid fa-utensils"></i>

            <p>
                Search your favourite item
            </p>

        </div>
    `;
}


function viewSearchResult(
    index,
    encodedQuery
) {
    const query =
        decodeURIComponent(encodedQuery);

    const item =
        getSearchMatches(query)[index];

    if (
        !item ||
        !item.element
    ) {
        return;
    }

    closeSearchModal();

    setTimeout(() => {
        item.element.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        item.element.style.boxShadow =
            "0 0 0 3px #fbbf24";

        setTimeout(() => {
            item.element.style.boxShadow = "";
        }, 2200);
    }, 250);
}


function addSearchResultToCart(
    index,
    encodedQuery
) {
    const query =
        decodeURIComponent(encodedQuery);

    const item =
        getSearchMatches(query)[index];

    if (
        !item ||
        !item.addButton
    ) {
        return;
    }

    item.addButton.click();
}


function clearMenuSearch() {
    const input =
        getElement("menu-search-input");

    const results =
        getElement("search-results");

    const clearButton =
        getElement("clear-search-btn");

    if (input) {
        input.value = "";
    }

    if (clearButton) {
        clearButton.style.display = "none";
    }

    if (results) {
        results.innerHTML =
            getDefaultSearchMessage();
    }
}


/* =========================================================
   OUTSIDE CLICK
========================================================= */

document.addEventListener(
    "click",
    event => {
        const modalIds = [
            "call-modal",
            "wa-modal",
            "cart-modal",
            "checkout-modal",
            "search-modal",
            "pizza-size-modal",
            "business-hours-modal",
            "order-status-modal",
            "bfc-alert-modal"
        ];

        modalIds.forEach(id => {
            const modal = getElement(id);

            if (
                modal &&
                event.target === modal
            ) {
                modal.classList.remove("active");
            }
        });
    }
);


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {
        if (event.key !== "Escape") {
            return;
        }

        document
            .querySelectorAll(
                ".modal-overlay.active"
            )
            .forEach(modal => {
                modal.classList.remove("active");
            });

        closeMobileMenu();
    }
);


/* =========================================================
   SEARCH EVENTS
========================================================= */

document.addEventListener(
    "input",
    event => {
        if (
            event.target.id !==
            "menu-search-input"
        ) {
            return;
        }

        searchMenu(
            event.target.value
        );
    }
);


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        renderPizzaMenu();

        createBurgerCollage(
            "meal2-burgers",
            5
        );

        createBurgerCollage(
            "meal3-burgers",
            10
        );

        updateCartUI();
        buildSearchIndex();

        showSlide(0);
        startSlider();
        revealElements();

        /*
            Resume previously pending order
            after page refresh.
        */

        if (
            currentActiveOrder &&
            normalizeOrderStatus(
                currentActiveOrder.status
            ) === "Pending"
        ) {
            startOrderStatusPolling(
                currentActiveOrder.orderId
            );
        }

        /*
            Render saved order status.
        */

        renderActiveOrderStatus();
    }
);


window.addEventListener(
    "scroll",
    revealElements,
    {
        passive: true
    }
);


window.addEventListener(
    "load",
    revealElements
);
