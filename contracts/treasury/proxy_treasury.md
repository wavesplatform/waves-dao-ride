### Required state entries

| key           | type     | description     |
| :------------ | :------- | :-------------- |
| `%s__factory` | `String` | Factory address |

### Callable functions

Sends `amount` Waves to provided recipient
- Can only be called by Factory

```
@Callable(i)
func transferWaves(recipientBytes: ByteVector, amount: Int)
```
