### Required state entries

| key                           | type     | description                   |
| :---------------------------- | :------- | :---------------------------- |
| `%s__calculator`              | `String` | Calculator Address            |
| `%s__proxyTreasury`           | `String` | Proxy Treasury Address        |
| `%s__mainTreasury`            | `String` | Main Treasury Address         |
| `%s__powerContract`           | `String` | Power dApp Address            |
| `%s__swapContract`            | `String` | WX Swap Contract Address      |
| `%s__config`                  | `String` | DAO Config address            |
| `%s__lpAssetId`               | `String` | LP Asset ID                   |
| `%s__powerAssetId`            | `String` | Power Asset ID                |
| `%s__currentPeriod`           | `Int`    | Current period num            |
| `%s__periodLength`            | `Int`    | Period length in blocks       |
| `%s%s__invested__WAVES`       | `Int`    | Invested Amount in Waves      |
| `%s%s__donated__WAVES`        | `Int`    | Donated Amount in Waves       |
| `%s%d__startHeight__<period>` | `Int`    | Starting Height of `<period>` |
| `%s%d__price__<period>`       | `Int`    | LP Asset Price for `<period>` |
| `%s__nextBlockToProcess`      | `Int`    | Next block height to process  |
| `%s__powerShareRatio`         | `Int`    | Power share ratio             |

### User state

| key                                         | type     | description                        |
| :------------------------------------------ | :------- | :--------------------------------- |
| `%s%s__available__<userAddress>`            | `Int`    | Available LP Asset amount to Claim |
| `%s%s__claimed__<userAddress>`              | `Int`    | LP Asset amount already claimed    |
| `%s%s__swappedToPower__<userAddress>`       | `Int`    | Waves amount swapped to Power      |
| `%s%s%s__withdrawal__<userAddress>__<txId>` | `String` | Withdrawal request parameters      |

```
# Withdrawal request value format
%s%d%d%s__<status>__<lpAssetAmount>__<targetPeriod>__<claimTxId>
```

---

### User functions

#### Claim LP

User can claim available LP Assets

```
@Callable(i)
func claimLP()
```
#### Invest Waves

User attach Waves payment and receive LP Asset at the current price

```
@Callable(i)
func invest()
```

#### Withdraw request

User attach LP Asset and creates withdraw request.
Claim can be done at the next Period

```
@Callable(i)
func withdraw()
```

#### Withdraw request cancellation

Cancel withdraw request. 
`txIdStr` - withdraw request TxId

```
@Callable(i)
func cancelWithdraw(txIdStr: String)
```

#### Claim Waves

Claim Waves from withdraw request at current price. 
`txIdStr` - withdraw request TxId

```
func claimWaves(txIdStr: String)
```

---

### Block processing

Process block miners rewards.
Block processing reward amount sent to caller.
Waves amount equals to Power Share Ratio is converted to Power Asset.
Power assets immediately staked in Power dApp Contract

```
@Callable(i)
func processBlocks()
```

---

### Finalize evaluation
Evaluate finalization results and required Waves amount to finish finalization.
Arguments:
- `newTreasuryVolumeInWaves` - Total treasury volume in Waves, include Invested and Donated amounts
- `pwrManagersBonusInWaves` - Power Manager bonus in Waves, this amount is deducted from Total profit when LP Price is calculated
- `treasuryVolumeDiffAllocationCoef` - Allocation coefficient ([-100000000; 100000000]), Profit/Loss distribution proportion.
  - `0` - Profit/Loss distributed to Invested and Donated evenly by their amounts proportions
  - `-100000000` All Profit/Loss is allocated to Donated part
  - `100000000` All Profit/Loss is allocated to Invested part
  - `-60000000` 60% of Invested Profit/Loss part is added to Donated part
  - `44000000` 44% of Donated Profit/Loss part is added to Invested part

Return values:
- `_1 = wavesToClaimPaymentAmount` - amount of Waves in payment needed to finish finalization
- `_2 = newInvestedWavesAmount` - new Invested Waves amount after finalization
- `_3 = newDonatedWavesAmountNew` - new Donated Waves amount after finalization
- `_4 = newPrice` - new Price for next Period
- `_5 = lpAssetAmountToBurn` - Amount of LP Assets burned for all withdrawals in current Period
- `_6 = lpAssetNewQuantity` - LP Asset new quantity

```
@Callable(i)
func finalizeREADONLY(
  newTreasuryVolumeInWaves: Int,
  pwrManagersBonusInWaves: Int,
  treasuryVolumeDiffAllocationCoef: Int
)
```

---

### Finalization

Finalize current period and calculate new Price. 
- Payment should include exact Waves amount needed to process all withdrawal requests.
- Can only be called by Main Treasury

Arguments:
- `newTreasuryVolumeInWaves` - Total treasury volume in Waves, include Invested and Donated amounts
- `pwrManagersBonusInWaves` - Power Manager bonus in Waves, this amount is deducted from Total profit when LP Price is calculated
- `treasuryVolumeDiffAllocationCoef` - Allocation coefficient ([-100000000; 100000000]), Profit/Loss distribution proportion.
  - `0` - Profit/Loss distributed to Invested and Donated evenly by their amounts proportions
  - `-100000000` All Profit/Loss is allocated to Donated part
  - `100000000` All Profit/Loss is allocated to Invested part
  - `-60000000` 60% of Invested Profit/Loss part is added to Donated part
  - `44000000` 44% of Donated Profit/Loss part is added to Invested part

```
@Callable(i)
func finalize(
  newTreasuryVolumeInWaves: Int,
  pwrManagersBonusInWaves: Int,
  treasuryVolumeDiffAllocationCoef: Int
)
```

---

### Helper functions

- Can only be called by Calculator

#### Factory state functions

```
@Callable(i)
func stringEntry(key: String, val: String)

@Callable(i)
func integerEntry(key: String, val: Int)

@Callable(i)
func booleanEntry(key: String, val: Boolean)

@Callable(i)
func binaryEntry(key: String, val: ByteVector)

@Callable(i)
func deleteEntry(key: String)
```

#### LP Asset functions

```
@Callable(i)
func reissue(amount: Int)

@Callable(i)
func burn(amount: Int)
```

#### Asset transfer functions

```
@Callable(i)
func transferAsset(recipientBytes: ByteVector, amount: Int, assetId: ByteVector)

@Callable(i)
func transferWaves(recipientBytes: ByteVector, amount: Int)
```

#### Transfer Waves from Proxy treasury

```
@Callable(i)
func transferFromProxyTreasury(recipientBytes: ByteVector, rewardsAmount: Int)
```
