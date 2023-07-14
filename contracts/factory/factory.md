### Required state entries

| key                           | type     | description                   |
| :---------------------------- | :------- | :---------------------------- |
| `%s__calculator`              | `String` | Calculator Address            |
| `%s__proxyTreasury`           | `String` | Proxy Treasury Address        |
| `%s__mainTreasury`            | `String` | Main Treasury Address         |
| `%s__config`                  | `String` | DAO Config address            |
| `%s__lpAssetId`               | `String` | LP Asset ID                   |
| `%s__currentPeriod`           | `Int`    | Current period num            |
| `%s__periodLength`            | `Int`    | Period length in blocks       |
| `%s%s__invested__WAVES`       | `Int`    | Invested Amount in Waves      |
| `%s%s__donated__WAVES`        | `Int`    | Donated Amount in Waves       |
| `%s%d__startHeight__<period>` | `Int`    | Starting Height of `<period>` |
| `%s%d__price__<period>`       | `Int`    | LP Asset Price for `<period>` |
| `%s__nextBlockToProcess`      | `Int`    | Next block height to process  |

### User state
| key                                         | type     | description                        |
| :------------------------------------------ | :------- | :--------------------------------- |
| `%s%s__available__<userAddress>`            | `Int`    | Available LP Asset amount to Claim |
| `%s%s__claimed__<userAddress>`              | `Int`    | LP Asset amount already claimed    |
| `%s%s%s__withdrawal__<userAddress>__<txId>` | `String` | Withdrawl request parameters       |
```
# Withdrawl request value format
%s%d%d%s__<status>__<lpAssetAmount>__<targetPeriod>__<claimTxId>
```


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
### Block processing
Process block miners rewards. 
```
@Callable(i)
func processBlocks()
```

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
func transferAsset(recepientBytes: ByteVector, amount: Int, assetId: ByteVector)

@Callable(i)
func transferWaves(recepientBytes: ByteVector, amount: Int)
```
#### Transfer Waves from Proxy treasury
```
@Callable(i)
func transferFromProxyTreasury(recipientBytes: ByteVector, rewardsAmount: Int)
```
