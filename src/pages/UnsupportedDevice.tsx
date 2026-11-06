export function UnsupportedDevice() {
  return (
    <div className="unsupported-page">
      <div className="unsupported-card">
        <span className="material-icons unsupported-icon" aria-hidden="true">
          location_off
        </span>
        <h1>この端末ではご利用できません</h1>
        <p>本アプリはGPS機能を持つスマートフォンでのご利用を推奨しています。</p>
        <p>位置情報に対応した端末でお試しください。</p>
      </div>
    </div>
  )
}
