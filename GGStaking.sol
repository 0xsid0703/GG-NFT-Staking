// SPDX-License-Identifier: MIT

/*


 
 ██████   ██████      ███    ██ ███████ ████████     ███████ ████████  █████  ██   ██ ██ ███    ██  ██████  
██       ██           ████   ██ ██         ██        ██         ██    ██   ██ ██  ██  ██ ████   ██ ██       
██   ███ ██   ███     ██ ██  ██ █████      ██        ███████    ██    ███████ █████   ██ ██ ██  ██ ██   ███ 
██    ██ ██    ██     ██  ██ ██ ██         ██             ██    ██    ██   ██ ██  ██  ██ ██  ██ ██ ██    ██ 
 ██████   ██████      ██   ████ ██         ██        ███████    ██    ██   ██ ██   ██ ██ ██   ████  ██████  
                                                                                                            
                                                                                                        

*/

pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Required interface of an ERC721 compliant contract.
 */


contract GGStaking is Ownable {
    struct TokenInfo {
        bool isLegendary;
        uint8 squadId; //Adventure, Bling, Business, Chill, Love, Misfit, Party, Space
    }
    // uint256 squadCount = 8;
    uint256[] public squadTokenFeatures = [0, 1, 2, 3, 4, 5, 6, 7];
    mapping(uint256 => TokenInfo) public tokenInfos;
    mapping(address => mapping(uint256 => uint256)) public ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;
    mapping(address => UserInfo) public userInfos;

    //Info each user
    struct UserInfo {
        uint256 totalNFTCountForHolder;
        bool isLegendaryStaker;
        uint256 stakedLegendaryCountForHolder;
        bool isAllSquadStaker;
        bool commonNFTHolder;
        uint256 commonNFTCountForHolder;
        uint256 pendingRewards;
        uint256 rewardDebt;
        uint256 depositNumber;
    }
    uint256 private _totalRewardBalance;
    uint256 public accLegendaryPerShare;
    uint256 public accAllSquadPerShare;
    uint256 public accCommonNFTPerShare;

    uint256 public currentLegendaryReward;
    uint256 public currentAllSquadReward;
    uint256 public currentCommonNFTReward;

    uint256 public totalStakedGators;
    uint256 public totalLegendaryStaked;
    uint256 public totalAllSquadHolders;
    uint256 public totalCommonNFTsStaked;
    uint256 public totalDepositCount;
    uint256 public lastDepositTime;
    uint256 public unusedRewardPot;

    uint256 public legendaryRewardsPercent;
    uint256 public allSquadRewardsPercent;
    uint256 public commonRewardsPercent;
    IERC721 public immutable nftToken;
    IERC20 public immutable egToken;

    //ClaimFee
    uint256 public claimFee;
    address public claimFeeWallet;

    event Staked(address staker, uint256[] tokenId);
    event UnStaked(address staker, uint256[] tokenId);
    event Claim(address staker, uint256 amount);
    event SetRewardsPercent(
        uint256 _legendaryPercent,
        uint256 _allSquadPercent,
        uint256 _commonPercent
    );
    event DepositReward(address indexed user, uint256 amount);
    event SetClaimFee(uint256 _claimFee);
    event SetClaimFeeWallet(address _claimFeeWallet);
    event WithdrawUnusedRewardPot(uint256 unusedRewardPot);

    constructor(IERC721 _nftToken, IERC20 _egToken) {
        nftToken = _nftToken;
        egToken = _egToken;
    }
    function withdrawUnusedRewardPot() external onlyOwner {
        require(
            unusedRewardPot > 0,
            "withdrawUnusedRewardPot: unusedRewardPot should be greater than 0"
        );
        egToken.transfer(owner(), unusedRewardPot);
        unusedRewardPot = 0;
        emit WithdrawUnusedRewardPot(unusedRewardPot);
    }
    function setClaimFee(uint256 _claimFee) external onlyOwner {
        require(
            _claimFee > 0 && _claimFee < 100,
            "setClaimFee: amount should be greater than 0 and smaller than 100"
        );
        require(
            claimFeeWallet != address(0),
            "setClaimFee: the claimFeeWallet must have a valid address"
        );
        claimFee = _claimFee;
        emit SetClaimFee(_claimFee);
    }

    function setClaimFeeWallet(address _claimFeeWallet) external onlyOwner {
        claimFeeWallet = _claimFeeWallet;
        emit SetClaimFeeWallet(_claimFeeWallet);
    }

    function setTokenInfo(
        uint256[] calldata _ids,
        uint8[] calldata _isLegendaries,
        uint8[] calldata _squadIds
    ) external onlyOwner {
        require(_ids.length > 0, "setTokenInfo: Empty array");
        require(
            (_ids.length == _isLegendaries.length) &&
                (_ids.length == _squadIds.length),
            "setTokenInfo: the array lengths should match"
        );
        for (uint256 i = 0; i < _ids.length; i++) {
            require(
                _squadIds[i] < squadTokenFeatures.length,
                "setTokenInfo: the squadId should be less than squadTokenFeature length"
            );
        }
        for (uint256 i = 0; i < _ids.length; i++) {
            TokenInfo storage tokenInfo = tokenInfos[_ids[i]];
            tokenInfo.isLegendary = _isLegendaries[i] == 0 ? false : true;
            tokenInfo.squadId = _squadIds[i];
        }
    }

    function depositReward(uint256 _amount) external onlyOwner {
        require(
            legendaryRewardsPercent +
                allSquadRewardsPercent +
                commonRewardsPercent ==
                100,
            "depositReward: the total rewards percent should be 100"
        );
        require(
            totalStakedGators > 0,
            "depositReward: the totalStakedGators should be greater than 0"
        );
        lastDepositTime = block.timestamp;
        egToken.transferFrom(msg.sender, address(this), _amount);

        _totalRewardBalance = _totalRewardBalance + _amount;
        uint256 legendaryRewards = (_amount * legendaryRewardsPercent) / 100;
        uint256 allSquadRewards = (_amount * allSquadRewardsPercent) / 100;
        uint256 commonNFTRewards = (_amount * commonRewardsPercent) / 100;
        if (totalLegendaryStaked > 0) {
            currentLegendaryReward = legendaryRewards / totalLegendaryStaked;
            accLegendaryPerShare =
                accLegendaryPerShare +
                ((legendaryRewards * (1e12)) / totalLegendaryStaked);
        } else {
            unusedRewardPot = unusedRewardPot + legendaryRewards;
            currentLegendaryReward = legendaryRewards;
        }
        if (totalAllSquadHolders > 0) {
            currentAllSquadReward = allSquadRewards / totalAllSquadHolders;
            accAllSquadPerShare =
                accAllSquadPerShare +
                ((allSquadRewards * 1e12) / totalAllSquadHolders);
        } else {
            unusedRewardPot = unusedRewardPot + allSquadRewards;
            currentAllSquadReward = allSquadRewards;
        }
        if (totalCommonNFTsStaked > 0) {
            currentCommonNFTReward = commonNFTRewards / totalCommonNFTsStaked;
            accCommonNFTPerShare =
                accCommonNFTPerShare +
                ((commonNFTRewards * (1e12)) / totalCommonNFTsStaked);
        } else {
            unusedRewardPot = unusedRewardPot + commonNFTRewards;
            currentCommonNFTReward = commonNFTRewards;
        }
        totalDepositCount++;
        emit DepositReward(msg.sender, _amount);
    }
    function userStakedNFTs(address _user) external view returns (uint256[] memory) {
        UserInfo storage user = userInfos[_user];
        uint256[] memory userNFTs = new uint256[](user.totalNFTCountForHolder);
        for(uint256 i = 0; i < user.totalNFTCountForHolder; i++){
            userNFTs[i] = ownedTokens[_user][i];
        }
        return userNFTs;
    }

    function totalRewardBalance() external view returns (uint256) {
        return _totalRewardBalance;
    }

    function setRewardsPercent(
        uint256 _legendaryRewardsPercent,
        uint256 _allSquadRewardsPercent,
        uint256 _commonRewardsPercent
    ) external onlyOwner {
        require(
            _legendaryRewardsPercent +
                _allSquadRewardsPercent +
                _commonRewardsPercent ==
                100,
            "setRewardsPercent: the total rewards percent should be 100"
        );
        legendaryRewardsPercent = _legendaryRewardsPercent;
        allSquadRewardsPercent = _allSquadRewardsPercent;
        commonRewardsPercent = _commonRewardsPercent;
        emit SetRewardsPercent(
            _legendaryRewardsPercent,
            _allSquadRewardsPercent,
            _commonRewardsPercent
        );
    }

    function getPending(address _user) external view returns (uint256) {
        UserInfo storage user = userInfos[_user];
        uint256 pending;
        if (user.depositNumber < totalDepositCount) {
            pending = _getPending(_user);
            return (user.pendingRewards + pending - user.rewardDebt);
        }
        return (user.pendingRewards);
    }

    function unstake(uint256[] calldata tokenIds) external {
        require(tokenIds.length > 0, "NFT unstake: Empty Array");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                ownedTokens[msg.sender][_ownedTokensIndex[tokenIds[i]]] ==
                    tokenIds[i],
                "NFT unstake: token not staked or incorrect token owner"
            );
            for (uint256 j = i + 1; j < tokenIds.length; j++) {
                require(
                    tokenIds[i] != tokenIds[j],
                    "NFT unstake: duplicate token ids in input params"
                );
            }
        }
        UserInfo storage user = userInfos[msg.sender];
        uint256 pending;
        if (user.depositNumber < totalDepositCount) {
            pending = _getPending(msg.sender);
            user.pendingRewards =
                user.pendingRewards +
                pending -
                user.rewardDebt;
        }
        uint256 lastTokenIndex;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            lastTokenIndex = user.totalNFTCountForHolder - i - 1;
            if (_ownedTokensIndex[tokenIds[i]] != lastTokenIndex) {
                ownedTokens[msg.sender][
                    _ownedTokensIndex[tokenIds[i]]
                ] = ownedTokens[msg.sender][lastTokenIndex];
                _ownedTokensIndex[
                    ownedTokens[msg.sender][lastTokenIndex]
                ] = _ownedTokensIndex[tokenIds[i]];
            }
            delete _ownedTokensIndex[tokenIds[i]];
            delete ownedTokens[msg.sender][lastTokenIndex];
            nftToken.transferFrom(address(this), msg.sender, tokenIds[i]);
        }
        user.totalNFTCountForHolder =
            user.totalNFTCountForHolder -
            tokenIds.length;
        totalStakedGators = totalStakedGators - tokenIds.length;
        uint256 requireUnStakeLegendaryCount = 0;
        uint256 requireUnStakeCommonNFTCount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            TokenInfo storage token = tokenInfos[tokenIds[i]];
            if (token.isLegendary) {
                requireUnStakeLegendaryCount++;
            }
        }
        requireUnStakeCommonNFTCount =
            tokenIds.length -
            requireUnStakeLegendaryCount;
        if (requireUnStakeLegendaryCount > 0) {
            if (
                user.stakedLegendaryCountForHolder ==
                requireUnStakeLegendaryCount
            ) {
                user.isLegendaryStaker = false;
                user.stakedLegendaryCountForHolder = 0;
            } else {
                user.stakedLegendaryCountForHolder =
                    user.stakedLegendaryCountForHolder -
                    requireUnStakeLegendaryCount;
            }
            totalLegendaryStaked =
                totalLegendaryStaked -
                requireUnStakeLegendaryCount;
        }
        if (requireUnStakeCommonNFTCount > 0) {
            if (user.commonNFTCountForHolder < requireUnStakeCommonNFTCount) {
                if (user.isAllSquadStaker) {
                    user.isAllSquadStaker = false;
                    totalAllSquadHolders--;
                    user.commonNFTCountForHolder =
                        user.commonNFTCountForHolder +
                        squadTokenFeatures.length -
                        requireUnStakeCommonNFTCount;
                    totalLegendaryStaked =
                        totalLegendaryStaked +
                        squadTokenFeatures.length -
                        requireUnStakeCommonNFTCount;
                }
            } else {
                bool freeCommonSubFlag = true;
                if (user.isAllSquadStaker) {
                    bool allSquadStatus = checkAllSquadStaker();
                    if (!allSquadStatus) {
                        freeCommonSubFlag = false;
                    }
                }

                if (freeCommonSubFlag) {
                    user.commonNFTCountForHolder =
                        user.commonNFTCountForHolder -
                        requireUnStakeCommonNFTCount;
                    totalCommonNFTsStaked =
                        totalCommonNFTsStaked -
                        requireUnStakeCommonNFTCount;
                } else {
                    user.isAllSquadStaker = false;
                    totalAllSquadHolders--;
                    user.commonNFTCountForHolder =
                        user.commonNFTCountForHolder +
                        squadTokenFeatures.length -
                        requireUnStakeCommonNFTCount;
                    totalCommonNFTsStaked =
                        totalCommonNFTsStaked +
                        squadTokenFeatures.length -
                        requireUnStakeCommonNFTCount;
                }
            }

            if (user.commonNFTCountForHolder == 0 && user.commonNFTHolder) {
                user.commonNFTHolder = false;
            } else if (
                user.commonNFTCountForHolder > 0 && !user.commonNFTHolder
            ) {
                user.commonNFTHolder = true;
            }
        }

        pending = _getPending(msg.sender);
        user.rewardDebt = pending;
        user.depositNumber = totalDepositCount;
        emit UnStaked(msg.sender, tokenIds);
    }

    function stake(uint256[] calldata tokenIds) external {
        require(tokenIds.length > 0, "NFT Stake: Empty Array");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                nftToken.ownerOf(tokenIds[i]) == msg.sender,
                "NFT Stake: only Owner of NFT can stake it"
            );
            for (uint256 j = i + 1; j < tokenIds.length; j++) {
                require(
                    tokenIds[i] != tokenIds[j],
                    "NFT Stake: duplicate token ids in input parameters"
                );
            }
        }

        UserInfo storage user = userInfos[msg.sender];
        uint256 pending;
        if (user.depositNumber < totalDepositCount) {
            pending = _getPending(msg.sender);
            user.pendingRewards =
                user.pendingRewards +
                pending -
                user.rewardDebt;
        }
        uint256 lastTokenIndex;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            lastTokenIndex = user.totalNFTCountForHolder + i;
            ownedTokens[msg.sender][lastTokenIndex] = tokenIds[i];
            _ownedTokensIndex[tokenIds[i]] = lastTokenIndex;
            nftToken.transferFrom(msg.sender, address(this), tokenIds[i]);
        }
        user.totalNFTCountForHolder =
            user.totalNFTCountForHolder +
            tokenIds.length;
        totalStakedGators = totalStakedGators + tokenIds.length;
        uint256 requireStakeLegendaryCount = 0;
        uint256 requireStakeCommonNFTCount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            TokenInfo storage token = tokenInfos[tokenIds[i]];
            if (token.isLegendary) {
                if (!user.isLegendaryStaker) user.isLegendaryStaker = true;
                requireStakeLegendaryCount++;
            } else {
                if (!user.commonNFTHolder) user.commonNFTHolder = true;
            }
        }
        requireStakeCommonNFTCount =
            tokenIds.length -
            requireStakeLegendaryCount;
        if (requireStakeLegendaryCount > 0) {
            if (!user.isLegendaryStaker) {
                user.isLegendaryStaker = true;
            }
            user.stakedLegendaryCountForHolder =
                user.stakedLegendaryCountForHolder +
                requireStakeLegendaryCount;
            totalLegendaryStaked =
                totalLegendaryStaked +
                requireStakeLegendaryCount;
        }
        if (requireStakeCommonNFTCount > 0) {
            bool freeCommonSumFlag = true;
            if (
                !user.isAllSquadStaker &&
                (user.commonNFTCountForHolder + requireStakeCommonNFTCount) >=
                squadTokenFeatures.length
            ) {
                bool allSquadStatus = checkAllSquadStaker();
                if (allSquadStatus) {
                    freeCommonSumFlag = false;
                }
            }
            if (freeCommonSumFlag) {
                user.commonNFTCountForHolder =
                    user.commonNFTCountForHolder +
                    requireStakeCommonNFTCount;
                totalCommonNFTsStaked =
                    totalCommonNFTsStaked +
                    requireStakeCommonNFTCount;
            } else {
                user.isAllSquadStaker = true;
                user.commonNFTCountForHolder =
                    user.commonNFTCountForHolder +
                    requireStakeCommonNFTCount -
                    squadTokenFeatures.length;
                totalAllSquadHolders++;
                totalCommonNFTsStaked =
                    totalCommonNFTsStaked +
                    requireStakeCommonNFTCount -
                    squadTokenFeatures.length;
            }
        }
        pending = _getPending(msg.sender);
        user.rewardDebt = pending;
        user.depositNumber = totalDepositCount;
        emit Staked(msg.sender, tokenIds);
    }

    function claim() external {
        UserInfo storage user = userInfos[msg.sender];
        uint256 pending = _getPending(msg.sender);
        uint256 amount = user.pendingRewards;
        if (user.depositNumber < totalDepositCount) {
            amount = amount + pending - user.rewardDebt;
        }
        require(
            amount > 0,
            "claim: the pending amount should be greater that 0"
        );
        if (egToken.balanceOf(address(this)) < amount) {
            user.pendingRewards = amount - egToken.balanceOf(address(this));
            amount = egToken.balanceOf(address(this));
        } else {
            user.pendingRewards = 0;
        }
        user.rewardDebt = pending;
        if(claimFee > 0) {
            uint256 feeAmount = amount * claimFee / 100;
            egToken.transfer(claimFeeWallet, feeAmount);
            amount = amount - feeAmount;
        }
        egToken.transfer(msg.sender, amount);
        emit Claim(msg.sender, amount);
    }

    function _getPending(address _user) private view returns (uint256) {
        UserInfo storage user = userInfos[_user];
        uint256 pending;
        if (user.isLegendaryStaker) {
            pending =
                (user.stakedLegendaryCountForHolder * accLegendaryPerShare) /
                (1e12);
        }
        if (user.isAllSquadStaker) {
            pending = pending + (accAllSquadPerShare / (1e12));
        }
        if (user.commonNFTHolder) {
            pending =
                pending +
                ((user.commonNFTCountForHolder * accCommonNFTPerShare) /
                    (1e12));
        }
        return pending;
    }

    function checkAllSquadStaker() private view returns (bool) {
        UserInfo storage user = userInfos[msg.sender];
        uint8[] memory userSquadTokenFeatures = new uint8[](
            squadTokenFeatures.length
        );

        for (uint256 i = 0; i < user.totalNFTCountForHolder; i++) {
            TokenInfo storage tokenInfo = tokenInfos[
                ownedTokens[msg.sender][i]
            ];
            if (tokenInfo.isLegendary) continue;
            userSquadTokenFeatures[tokenInfo.squadId] = 1;
        }
        uint8 userSquadTokenFeaturesSum;
        for (uint256 i = 0; i < squadTokenFeatures.length; i++) {
            userSquadTokenFeaturesSum =
                userSquadTokenFeaturesSum +
                userSquadTokenFeatures[i];
        }
        if (userSquadTokenFeaturesSum == userSquadTokenFeatures.length) {
            return true;
        } else {
            return false;
        }
    }
}
