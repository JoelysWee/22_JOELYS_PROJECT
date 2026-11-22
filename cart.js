const cartDialog = document.getElementById('cart-dialog');
const cartItemsElement = document.getElementById('cart-items');
const cartEmpty = document.getElementById('cart-empty');
const cartCount = document.getElementById('cart-count');
const cartOpen = document.getElementById('cart-open');
const cartStatus = document.getElementById('cart-status');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartStorageKey = 'infinitycarrot-cart';
const legacyStorageKey = 'infinitycarrot-artmaterials-cart';
const products = new Map(
  Array.from(document.querySelectorAll('.add-to-cart')).map((button) => {
    const article = button.closest('.crochet_art-item');
    return [button.dataset.productId, {
      name: article.querySelector('h2').textContent.trim(),
      priceCents: Math.round(Number(button.dataset.price) * 100)
    }];
  })
);
let cart = [];

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    return true;
  } catch (error) {
    return false;
  }
}

try {
  const savedCart = localStorage.getItem(cartStorageKey);
  const isLegacyCart = savedCart === null;
  const storedCart = JSON.parse(savedCart === null
    ? localStorage.getItem(legacyStorageKey) || '[]'
    : savedCart);
  if (Array.isArray(storedCart)) {
    cart = storedCart.flatMap((item) => {
      if (!item || typeof item.id !== 'string' ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1) return [];
      const currentProduct = products.get(item.id);
      const name = typeof item.name === 'string' ? item.name : currentProduct && currentProduct.name;
      const priceCents = Number.isSafeInteger(item.priceCents)
        ? item.priceCents
        : currentProduct && currentProduct.priceCents;
      if (!name || !Number.isSafeInteger(priceCents) || priceCents < 0) return [];
      return [{ id: item.id, name, priceCents, quantity: item.quantity }];
    });
    if (isLegacyCart && cart.length > 0) saveCart();
  }
} catch (error) {
  cartStatus.textContent = 'Your saved cart could not be loaded. You can still add items during this visit.';
}

function changeProductQuantity(productId, amount) {
  const product = products.get(productId);
  const existingItem = cart.find((item) => item.id === productId);
  if (existingItem) {
    existingItem.quantity += amount;
    if (existingItem.quantity < 1) {
      cart = cart.filter((item) => item.id !== productId);
    }
  } else if (amount > 0) {
    cart.push({ id: productId, ...product, quantity: amount });
  }

  const saved = saveCart();
  renderCart();
  const item = cart.find((cartItem) => cartItem.id === productId);
  cartStatus.textContent = item
    ? `${product.name} quantity updated${saved ? '.' : ' for this visit, but could not be saved in this browser.'}`
    : `${product.name} removed from your cart${saved ? '.' : ' for this visit, but the cart could not be saved in this browser.'}`;
}

function renderInlineQuantities() {
  document.querySelectorAll('.add-to-cart').forEach((button) => {
    const productId = button.dataset.productId;
    const product = products.get(productId);
    let actionGroup = button.parentElement;
    if (!actionGroup.classList.contains('cart-action-group')) {
      actionGroup = document.createElement('div');
      actionGroup.className = 'cart-action-group';
      button.parentElement.insertBefore(actionGroup, button);
      actionGroup.append(button);
    }

    let control = actionGroup.querySelector('.inline-cart-quantity');

    if (!control) {
      control = document.createElement('div');
      control.className = 'inline-cart-quantity';
      control.setAttribute('role', 'group');
      control.setAttribute('aria-label', `${product.name} quantity`);

      const decrement = document.createElement('button');
      decrement.type = 'button';
      decrement.textContent = '-';
      decrement.setAttribute('aria-label', `Decrease ${product.name} quantity`);
      decrement.addEventListener('click', () => changeProductQuantity(productId, -1));

      const count = document.createElement('output');
      count.className = 'inline-cart-count';
      count.setAttribute('aria-live', 'polite');

      const increment = document.createElement('button');
      increment.type = 'button';
      increment.textContent = '+';
      increment.setAttribute('aria-label', `Increase ${product.name} quantity`);
      increment.addEventListener('click', () => changeProductQuantity(productId, 1));

      control.append(decrement, count, increment);
      actionGroup.insertBefore(control, button);
    }

    const item = cart.find((cartItem) => cartItem.id === productId);
    control.classList.toggle('is-visible', Boolean(item));
    control.setAttribute('aria-hidden', String(!item));
    if (item) control.querySelector('.inline-cart-count').textContent = item.quantity;
  });
}

function renderCart() {
  cartItemsElement.replaceChildren();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  cartCount.textContent = itemCount;
  cartOpen.setAttribute('aria-label', `Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`);
  cartEmpty.hidden = cart.length > 0;
  cartItemsElement.hidden = cart.length === 0;

  let subtotal = 0;
  cart.forEach((item) => {
    const lineTotal = item.priceCents * item.quantity;
    subtotal += lineTotal;

    const row = document.createElement('li');
    row.className = 'cart-item';

    const details = document.createElement('div');
    details.className = 'cart-item-details';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const price = document.createElement('span');
    price.textContent = `$${(item.priceCents / 100).toFixed(2)} each`;
    details.append(name, price);

    const controls = document.createElement('div');
    controls.className = 'cart-item-controls';
    const quantityLabel = document.createElement('label');
    quantityLabel.textContent = 'Qty';
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.step = '1';
    quantityInput.value = item.quantity;
    quantityInput.setAttribute('aria-label', `${item.name} quantity`);
    quantityInput.addEventListener('change', () => {
      const quantity = quantityInput.valueAsNumber;
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        quantityInput.value = item.quantity;
        cartStatus.textContent = 'Quantity must be a whole number greater than zero.';
        return;
      }
      item.quantity = quantity;
      const saved = saveCart();
      renderCart();
      cartStatus.textContent = saved
        ? `${item.name} quantity updated.`
        : `${item.name} quantity updated for this visit, but could not be saved in this browser.`;
    });
    quantityLabel.append(quantityInput);

    const total = document.createElement('strong');
    total.textContent = `$${(lineTotal / 100).toFixed(2)}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'cart-remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${item.name} from cart`);
    remove.addEventListener('click', () => {
      cart = cart.filter((cartItem) => cartItem.id !== item.id);
      const saved = saveCart();
      renderCart();
      cartStatus.textContent = saved
        ? `${item.name} removed from your cart.`
        : `${item.name} removed for this visit, but the cart could not be saved in this browser.`;
    });

    controls.append(quantityLabel, total, remove);
    row.append(details, controls);
    cartItemsElement.append(row);
  });

  cartSubtotal.textContent = `$${(subtotal / 100).toFixed(2)}`;
  renderInlineQuantities();
}

document.querySelectorAll('.add-to-cart').forEach((button) => {
  button.addEventListener('click', () => {
    const product = products.get(button.dataset.productId);
    const existingItem = cart.find((item) => item.id === button.dataset.productId);
    if (existingItem) existingItem.quantity += 1;
    else cart.push({ id: button.dataset.productId, ...product, quantity: 1 });
    const saved = saveCart();
    renderCart();
    cartStatus.textContent = saved
      ? `${product.name} added to your cart.`
      : `${product.name} added for this visit, but the cart could not be saved in this browser.`;
  });
});

cartOpen.addEventListener('click', () => cartDialog.showModal());
document.getElementById('cart-close').addEventListener('click', () => cartDialog.close());
cartDialog.addEventListener('click', (event) => {
  if (event.target === cartDialog) cartDialog.close();
});

renderCart();
