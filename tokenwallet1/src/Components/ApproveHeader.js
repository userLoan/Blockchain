import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export default function ApproveToken({ token }) {
  const [account, setAccount] = useState('');
  const [spender, setSpender] = useState('');
  const [amount, setAmount] = useState('');     // ERC20
  const [tokenId, setTokenId] = useState('');   // ERC721
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());
    })();
  }, []);

  if (!token) return null;

  async function handleApprove() {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const c = new ethers.Contract(token.address, token.abi, signer);

      if (token.decimals !== undefined) {
        // ERC20
        const value = ethers.parseUnits(amount || '0', token.decimals);
        const tx = await c.approve(spender, value);
        setStatus('Waiting for confirmation...');
        await tx.wait();
        setStatus('Approved successfully.');
      } else {
        // ERC721
        const id = BigInt(tokenId);
        const tx = await c.approve(spender, id);
        setStatus('Waiting for confirmation...');
        await tx.wait();
        setStatus('Approved successfully.');
      }
    } catch (e) {
      setStatus(e.message || String(e));
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div>Token: <strong>{token.name}</strong> ({token.symbol})</div>
      <label>Spender / Operator</label>
      <input value={spender} onChange={e => setSpender(e.target.value)} placeholder="0x..." />
      {token.decimals !== undefined ? (
        <>
          <label>Amount ({token.symbol})</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 100" />
        </>
      ) : (
        <>
          <label>Token ID</label>
          <input value={tokenId} onChange={e => setTokenId(e.target.value)} placeholder="e.g., 0" />
        </>
      )}
      <button onClick={handleApprove}>Approve</button>
      <small style={{ color: '#666' }}>From: {account}</small>
      {status && <div style={{ marginTop: 6 }}>{status}</div>}
    </div>
  );
}
