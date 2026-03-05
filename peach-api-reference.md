# Peach Bitcoin API Reference

**Base URL:** `https://api.peachbitcoin.com/v1`  
**Source:** github.com/Peach2Peach/peach-api-ts  
**Docs:** docs.peachbitcoin.com

---

## Authentication

Public endpoints need no credentials. Private endpoints require a Bearer token (valid 60 min).  
First call: `POST /user/register`. Subsequently: `POST /user/auth`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/register` | Register new account. Body: `publicKey, message, signature`. |
| POST | `/user/auth` | Get access token. Body: `publicKey, message, signature`. Returns: `{ accessToken, expiry }`. |

---

## System — Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/system/status` | Server status. Returns: `{ error, status, serverTime }`. |
| GET | `/info` | Platform info: PGP key, fees, payment methods list. |
| GET | `/info/paymentMethods` | List all supported payment methods with currencies. |
| GET | `/estimateFees` | Current Bitcoin fee estimates (sat/vB). |

---

## Market — Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market/price/:pair` | Price for a specific pair (e.g. BTCEUR). |
| GET | `/market/prices` | Prices for all pairs. |
| GET | `/market/tradePricePeaks` | All-time high trade prices per currency. |

---

## Blockchain — Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tx/:txid` | Get transaction data by txid. |
| POST | `/tx` | Broadcast a raw transaction. Body: `{ tx: hex_string }`. |

---

## Users — Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/:userId` | Get public user profile by public key (userId). |
| GET | `/user/:userId/ratings` | Get ratings for a user. |
| GET | `/user/referral` | Check validity of a referral code. Query: `{ code }`. |

---

## Users — Private 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/me` | Get own profile: trades, rating, payment methods, etc. |
| GET | `/user/me/paymentMethods` | Own registered payment method info. |
| GET | `/user/tradingLimit` | Own trading limits. |
| PATCH | `/user` | Update own profile. Body: user fields, optional PGP key. |
| GET | `/user/:userId/status` | Get status of another user (online, etc.). |
| PUT | `/user/:userId/block` | Block a user. |
| DELETE | `/user/:userId/block` | Unblock a user. |
| PATCH | `/user/batching` | Join or leave GroupHug batching program. Body: `{ enable: bool }`. |
| PATCH | `/user/referral/redeem/referralCode` | Redeem Peach points for a new referral code. |
| PATCH | `/user/referral/redeem/fiveFreeTrades` | Redeem points for five free trades. |
| PATCH | `/user/paymentHash` | Unlink payment hashes. Body: `{ hashes: string[] }`. |
| PATCH | `/user/logout` | Logout (unregisters push notifications). |

---

## Offers — Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/offer/:offerId` | Get public details of an offer. |
| POST | `/offer/search` | Search offers. Body: `{ type, meansOfPayment, ... }`, filters: `{ sortBy, size, ... }`. |

---

## Offers — Private 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/offers` | Get all own offers. |
| GET | `/offers/summary` | Get summaries of own offers. |
| GET | `/offer/:offerId/details` | Get full private details of own offer. |
| POST | `/offer` | Create a buy offer (bid) or sell offer (ask). Buy body: `{ type:"bid", releaseAddress, paymentData, meansOfPayment, amount, maxPremium, ... }`. Sell body: `{ type:"ask", escrowPublicKey, meansOfPayment, amount, premium, ... }`. |
| PATCH | `/offer/:offerId` | Update a buy or sell offer. Same fields as POST. |
| POST | `/offer/:offerId/cancel` | Cancel an offer. |
| POST | `/offer/:offerId/revive` | Republish an expired sell offer. |
| POST | `/offer/:offerId/escrow` | Create escrow for a sell offer. Body: `{ publicKey }`. |
| GET | `/offer/:offerId/escrow` | Get escrow funding status. |
| POST | `/offer/:offerId/escrow/confirm` | Confirm escrow has been funded. |
| GET | `/offer/:offerId/refundPsbt` | Get refund PSBT for a cancelled sell offer. |
| POST | `/offer/:offerId/refund` | Submit signed refund transaction. Body: `{ tx: hex }`. |

---

## Matches — Private 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/offer/:offerId/matches` | Get potential matches for an offer. |
| POST | `/offer/match` | Match a sell offer (seller accepts buyer) or double-match a buy offer (buyer confirms seller). Body varies by role: `matchOfferId, paymentData, hashedPaymentData, signature`, etc. |
| DELETE | `/offer/match` | Unmatch a sell offer. Body: `{ matchOfferId }`. |

---

## Contracts — Private 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contracts` | Get all own contracts. |
| GET | `/contracts/summary` | Get summaries of own contracts. |
| GET | `/contract/:contractId` | Get full contract details. |
| POST | `/contract/:id/payment/confirm` | Buyer: confirm payment sent. Seller: confirm payment received + provide release transaction. Body: `{ releaseTransaction }`. |
| POST | `/contract/:id/rating` | Rate counterparty. Body: `{ rating: 1\|5, signature }`. |
| POST | `/contract/:id/cancel` | Request contract cancellation. Body: `{ reason }`. |
| POST | `/contract/:id/cancel/confirm` | Confirm counterparty's cancellation request. |
| POST | `/contract/:id/cancel/reject` | Reject counterparty's cancellation request. |
| PATCH | `/contract/:id/cancel/extendTime` | Extend payment timer by 12 hours (seller action). |
| GET | `/contract/:id/chat` | Get chat history. Query: `{ page }`. |
| POST | `/contract/:id/chat` | Send encrypted chat message. Body: `{ message, signature }`. |
| POST | `/contract/:id/chat/received` | Mark messages as read. Body: `{ start, end }` (message range). |
| POST | `/contract/:id/dispute` | Open a dispute. Body: `{ reason, symmetricKeyEncrypted, email }`. |
| POST | `/contract/:id/dispute/acknowledge` | Acknowledge a dispute opened by counterparty. Body: `{ email }`. |
| POST | `/contract/:id/dispute/acknowledgeOutcome` | Acknowledge dispute resolution outcome. |

---

## Contact — Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/contact/report` | Send a report. Body: `{ email, topic, reason, message }`. |

---

*Total: 63 endpoints | Auth: Bearer token in Authorization header | Content-Type: application/json | TypeScript wrapper: github.com/Peach2Peach/peach-api-ts*
