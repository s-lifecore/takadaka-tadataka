export function UnsupportedDevice() {
  return (
    <div className="unsupported-page">
      <div className="unsupported-card">
        <span className="material-icons unsupported-icon" aria-hidden="true">
          location_off
        </span>
        <h1>このデバイスじゃ冒険できないよ！</h1>
        <p>GPSを持ったスマートフォンで、歩いて絵を描く冒険に出かけよう！</p>
      </div>
    </div>
  )
}
