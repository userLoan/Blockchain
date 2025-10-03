export default function InstallMetamask() {
  return (
    <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12 }}>
      <h3>MetaMask not detected</h3>
      <p>Please install MetaMask and refresh this page.</p>
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
        Get MetaMask
      </a>
    </div>
  );
}
