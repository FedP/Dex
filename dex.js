/** ----Initialization---- */
const serverUrl = "https://dttith4k95rx.usemoralis.com:2053/server";
const appId = "Z5slbwrLoemsEUB10lLqUb0GgMK0YsmmLzRuOwTQ";
Moralis.start({ serverUrl, appId });

Moralis.initPlugins().then(() => console.log("Plugins have been initialized"));

const $tokenBalanceTBody = document.querySelector("js-token-balances");
const $selectedToken = document.querySelector(".js-from-token");
const $AmountInput = document.querySelector(".js-from-amount");

/** ----utilities---- */
const tokenValue = (value, decimals) =>
  decimals ? value / Math.pow(10, decimals) : value;

/** ----Login Logout and Initialization---- */
async function login() {
  let user = Moralis.User.current();
  if (!user) {
    user = await Moralis.authenticate();
  }
  console.log("logged in user:", user);
  getStats();
}

async function initSwapForm(event) {
  event.preventDefault();
  $selectedToken.innerText = event.target.dataset.symbol;
  $selectedToken.dataset.address = event.target.dataset.address;
  $selectedToken.dataset.decimals = event.target.dataset.decimals;
  $selectedToken.dataset.max = event.target.dataset.max;
  $AmountInput.removeAttribute("disabled");
  $AmountInput.value = "";
  document.querySelector(".js-submit").removeAttribute("disabled");
  document.querySelector(".js-cancel").removeAttribute("disabled");
  document.querySelector(".js-quote-container").innerHTML = "";

  document.querySelector("js.amount-error").innerText = "";
}

async function getStats() {
  // Function that return all the balances of the metamask account
  const balances = await Moralis.Web3API.account.getTokenBalances({
    chain: "polygon",
  });
  console.log(balances);
  $tokenBalanceTBody.innerHTML = balances
    .map(
      (token, index) => `
    <tr>
        <td>${index + 1}</td>
        <td>${token.symbol}</td>
        <td>${tokenValue(token.balance, token.decimals)}</td>
        <td>
            <button
                class = "js-swap btn btn-success"
                data-address="${token.token_address}"
                data-symbol = "${token.symbol}"
                data-decimals="${token.decimals}"
                data-max="${tokenValue(token.balance, token.decimals)}"
            >
                Swap
            </button>
        </td>
    </tr>
  `
    )
    .join("");

  for (let $btn of $tokenBalanceTBody.querySelectorAll(".js-swap")) {
    $btn.addEventListener("click", initSwapForm);
  }
}

async function buyCrypto() {
  Moralis.Plugins.fiat.buy();
}

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}

// Same as:
//document.querySelector("#btn-login").addEventlistener("click", login);
document.getElementById("btn-login").onclick = login;
document.getElementById("btn-buy-crypto").addEventListener("click", buyCrypto);
document.getElementById("btn-logout").onclick = logOut;

/** ----Quote/Swap---- */
async function formSubmitted(event) {
  event.preventDefault();
  const fromAmount = Number.parseFloat( $AmountInput.value);
  const fromMaxValue = Number.parseFloat( $selectedToken.dataset.max);
  //debugger;
  if ( Number.isNaN(fromAmount) || fromAmount > fromMaxValue ) {
    // invalid input
    document.querySelector(".js-amount-error").innerText = "Invalid amount";
    return;
  } else {
    document.querySelector("js.amount-error").innerText = "";
  }

  // Submission of the quote request

  const fromDecimals = $selectedToken.dataset.decimals;
  const fromTokenAddress = $selectedToken.dataset.address;

  const [toTokenAddress, toDecimals] = document.querySelector("[name=to-token]").value.split("-");

  // try{
  //   const quote = await Moralis.Plugins.oneInch.quote({
  //     chain: "polygon",
  //     fromTokenAddress: fromTokenAddress,
  //     toTokenAddress: toTokenAddress,
  //     amount: 1000,
  //   });  equivalent to 
    try{
    const quote = await Moralis.Plugins.oneInch.quote({
      chain: "polygon",
      fromTokenAddress,
      toTokenAddress,
      amount: Moralis.Units.Token(fromAmount, fromDecimals).toString()
    }); 

    const toAmount= tokenValue(quote.toTokenAmount, toDecimals);

    document.querySelector(".js-quote-container").innerHTML = `
    <p>${fromAmount} ${quote.fromToken.symbol} = ${toAmount} ${quote.toToken.symbol}
    </p>   
    <p> Gas fee: ${quote.estimatedGas}
    </p>
    `;

  } catch(e){
    document.querySelector(".js-quote-container").innerHTML = `
    <p class="error"> The conversion didn't succeed. </p>
    `;
  }

}

async function formCanceled(event) {
event.preventDefault();
document.querySelector(".js-submit").setAttribute("disabled", "");
document.querySelector(".js-cancel").setAttribute("disabled", "");
$AmountInput.value = "";
$AmountInput.setAttribute("disabled", "");

 delete $selectedToken.dataset.address;
 delete $selectedToken.dataset.decimals;
 delete $selectedToken.dataset.max;

document.querySelector(".js-quote-container").innerHTML = "";
document.querySelector("js.amount-error").innerText = "";
}


document.querySelector(".js-submit").addEventListener("click", formSubmitted);
document.querySelector(".js-cancel").addEventListener("click", formCanceled);

/** ----To token dropdown preparation---- */
async function Top10Coin() {
  try {
    const response = await fetch("https://api.coinpaprika.com/v1/coins");
    const tokens = await response.json();
    return tokens
      .filter((token) => token.rank > 0 && token.rank <= 30)
      .map((token) => token.symbol);
  } catch (e) {
    console.log(`Error: ${e}`);
  }
}

async function GetTickerAddresses(tickerList) {
  try {
    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
      chain: "polygon", // The blockchain you want to use (eth/bsc/polygon)
    });
    
    
    // await fetch("https://api.1inch.exchange/v3.0/137/tokens");
    // const tokens = await response.json();
    const tokenList = Object.values(tokens.tokens);

    return tokenList.filter((token) => tickerList.includes(token.symbol));
  } catch (e) {
    console.log(`Error: ${e}`);
  }
}

function renderTokenDropdown(tokens) {
  const options = tokens
    .map(
      (token) =>
        `<option value="${token.address}-${token.decimals}">
      ${token.name}
    </option>`
    )
    .join("");
  document.querySelector("[name=to-token]").innerHTML = options;
}

Top10Coin()
  //.then(tickerList1 => GetTickerAddresses(tickerList1)) //is equal to:
  .then(GetTickerAddresses)
  .then(renderTokenDropdown);
