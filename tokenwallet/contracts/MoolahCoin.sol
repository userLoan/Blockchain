// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MoolahCoin is ERC20, ERC20Capped, Ownable {
    constructor(address initialOwner)
        ERC20("Moolah Coin", "MC")
        ERC20Capped(10_000_000_000 * 10 ** 4)
        Ownable(initialOwner)
    {
        _mint(initialOwner, 1_000_000 * 10 ** 4);
    }

    function decimals() public pure override returns (uint8) { return 4; }

    // bắt buộc khi kết hợp ERC20 + ERC20Capped trong OZ v5
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    { super._update(from, to, value); }
}
