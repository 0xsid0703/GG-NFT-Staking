const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

const BINANCE_ROUTER_ADDRESS = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const baseURI = "https://eg-nft-api-dev.herokuapp.com/api/v1/nft/";
const SQUAD_FEATURE_CNT = 8;
const ADDR1_NFT_CNT = 18;
const ADDR1_LEGENDARY_CNT = 3;
const ADDR2_NFT_CNT = 20;
const ADDR2_LEGENDARY_CNT = 0;
const LEGENDARY_REWARD_PERCENT = 45;
const ALLSQUAD_REWARD_PERCENT = 45;
const COMMON_REWARD_PERCENT = 10;

const ADDR1_NFT_CNT1 = 12;
const ADDR1_LEGENDARY_CNT1 = 3;
const ADDR2_NFT_CNT1 = 15;
const ADDR2_LEGENDARY_CNT1 = 6;
const LEGENDARY_REWARD_PERCENT1 = 40;
const ALLSQUAD_REWARD_PERCENT1 = 40;
const COMMON_REWARD_PERCENT1 = 20;

describe("GatorGang NFT Staking test case", async () => {
  before(async () => {
    [owner, addr1, addr2, addr3, addr4, addr4, addr5, ...addrs] =
      await ethers.getSigners();

    ggFactory = await ethers.getContractFactory("GatorGang");
    gg = await ggFactory.connect(owner).deploy(baseURI);
    
    if (process.env.TEST_TOKEN === "EG") {
      // test script using egv2
      egFactory = await ethers.getContractFactory("EG");
      eg = await upgrades.deployProxy(egFactory, [BINANCE_ROUTER_ADDRESS], {
        initializer: "initialize",
        kind: "transparent",
      });
      await eg.deployed();
    } else {
      // test script using usdt
      egFactory = await ethers.getContractFactory("MockUSDT");
      eg = await egFactory.connect(owner).deploy();
    }

    ggStakingFactory = await ethers.getContractFactory("GGStaking");
    ggStaking = await ggStakingFactory
      .connect(owner)
      .deploy(gg.address, eg.address);

    if (process.env.TEST_TOKEN === "EG") {
      // white listing staking contract on egv2
      await eg
        .connect(owner)
        .addClientsToWhiteList([ggStaking.address.toString()]);
    }

    await eg
      .connect(owner)
      .approve(ggStaking.address, "700000000000000000000000");

    await gg.connect(owner).setPresaleStatus(true);
    await gg.connect(owner).addClientToWhiteList([addr1.address.toString()]);
    await gg.connect(owner).addClientToWhiteList([addr2.address.toString()]);
    await gg.connect(owner).setPresaleLimit(ADDR1_NFT_CNT + ADDR2_NFT_CNT + ADDR1_NFT_CNT1 + ADDR2_NFT_CNT1);
    let presalePrice = await gg.presalePrice();
    await gg
      .connect(addr1)
      .clientMint(ADDR1_NFT_CNT, { value: presalePrice.mul(ADDR1_NFT_CNT) });
    await gg.connect(addr1).setApprovalForAll(ggStaking.address, true);
    await gg
      .connect(addr2)
      .clientMint(ADDR2_NFT_CNT, { value: presalePrice.mul(ADDR2_NFT_CNT) });
    await gg.connect(addr2).setApprovalForAll(ggStaking.address, true);

    await gg
      .connect(addr1)
      .clientMint(ADDR1_NFT_CNT1, { value: presalePrice.mul(ADDR1_NFT_CNT1) });
    await gg.connect(addr1).setApprovalForAll(ggStaking.address, true);
    await gg
      .connect(addr2)
      .clientMint(ADDR2_NFT_CNT1, { value: presalePrice.mul(ADDR2_NFT_CNT1) });
    await gg.connect(addr2).setApprovalForAll(ggStaking.address, true);
  });
  describe("Deployment", async () => {
    it("should set owner correctly", async () => {
      expect(await ggStaking.owner()).to.equal(owner.address);
    });
  });
  describe("checked setTokenInfo", async () => {
    it("setTokenInfo: Empty array", async () => {
      await expect(ggStaking.connect(owner).setTokenInfo([],[],[])).to.be.revertedWith(
        "setTokenInfo: Empty array"
      );
    });
    it("setTokenInfo: the array lengths should match", async() => {
      await expect(ggStaking.connect(owner).setTokenInfo([1], [], [])).to.be.revertedWith(
        "setTokenInfo: the array lengths should match"
      );
    })
    it("setTokenInfo: the squadId should be less than squadTokenFeature length", async() => {
      await expect(ggStaking.connect(owner).setTokenInfo([0], [1], [SQUAD_FEATURE_CNT])).to.be.revertedWith(
        "setTokenInfo: the squadId should be less than squadTokenFeature length"
      );
    });
    it("checked setTokenInfo success", async () => {
      await ggStaking.connect(owner).setTokenInfo([0], [1], [1]);
      const tokenInfo = await ggStaking.connect(owner).tokenInfos(0);
      expect(tokenInfo.isLegendary).to.equal(true);
      expect(tokenInfo.squadId).to.equal(1);
      var ids = [], isLegendaries = [], squadIds = [];
      for (var i = 0; i < ADDR1_LEGENDARY_CNT; i++) {
        ids.push(i);
        isLegendaries.push(1);
        squadIds.push(i % SQUAD_FEATURE_CNT);
      }
      for (var i = ADDR1_LEGENDARY_CNT; i < ADDR1_NFT_CNT; i++) {
        ids.push(i);
        isLegendaries.push(0);
        squadIds.push((i - ADDR1_LEGENDARY_CNT) % SQUAD_FEATURE_CNT);
      }
      for (var i = 0; i < ADDR2_LEGENDARY_CNT; i++) {
        ids.push(i + ADDR1_NFT_CNT);
        isLegendaries.push(1);
        squadIds.push(i % SQUAD_FEATURE_CNT);
      }
      for (var i = ADDR2_LEGENDARY_CNT; i < ADDR2_NFT_CNT; i++) {
        ids.push(i + ADDR1_NFT_CNT);
        isLegendaries.push(0);
        squadIds.push((i - ADDR2_LEGENDARY_CNT) % SQUAD_FEATURE_CNT);
      }
      await ggStaking.connect(owner).setTokenInfo(ids, isLegendaries, squadIds);
    });
  });
  
  describe("checked stake", async () => {
    it("NFT Stake: Empty Array", async () => {
      await expect(ggStaking.connect(addr1).stake([])).to.be.revertedWith(
        "NFT Stake: Empty Array"
      );
    });
    it("NFT Stake: only Owner of NFT can stake it", async () => {
      await expect(
        ggStaking.connect(addr1).stake([ADDR1_NFT_CNT])
      ).to.be.revertedWith("NFT Stake: only Owner of NFT can stake it");
    });
    it("NFT Stake: duplicate token ids in input parameters", async () => {
      await expect(ggStaking.connect(addr1).stake([1, 1])).to.be.revertedWith(
        "NFT Stake: duplicate token ids in input parameters"
      );
    });
    it("stake tokens success", async () => {
      var tokenIds = [];
      for (var i = 0; i < ADDR1_NFT_CNT; i++) {
        tokenIds.push(i);
      }
      await ggStaking.connect(addr1).stake(tokenIds);
      const userInfo = await ggStaking.userInfos(addr1.address);
      expect(userInfo.totalNFTCountForHolder).to.equal(ADDR1_NFT_CNT);
      expect(userInfo.isLegendaryStaker).to.equal(true);
      expect(userInfo.stakedLegendaryCountForHolder).to.equal(
        ADDR1_LEGENDARY_CNT
      );
      expect(userInfo.isAllSquadStaker).to.equal(true);
      expect(userInfo.commonNFTHolder).to.equal(true);
      expect(userInfo.commonNFTCountForHolder).to.equal(
        ADDR1_NFT_CNT - SQUAD_FEATURE_CNT - ADDR1_LEGENDARY_CNT
      );
      tokenIds = [];
      for (var i = 0; i < ADDR2_NFT_CNT; i++) {
        tokenIds.push(i + ADDR1_NFT_CNT);
      }
      await ggStaking.connect(addr2).stake(tokenIds);
      const totalStakedGators = await ggStaking.totalStakedGators();
      const totalLegendaryStaked = await ggStaking.totalLegendaryStaked();
      const totalAllSquadHolders = await ggStaking.totalAllSquadHolders();
      const totalCommonNFTsStaked = await ggStaking.totalCommonNFTsStaked();
      expect(totalStakedGators).to.equal(ADDR1_NFT_CNT + ADDR2_NFT_CNT);
      expect(totalLegendaryStaked).to.equal(
        ADDR1_LEGENDARY_CNT + ADDR2_LEGENDARY_CNT
      );
      expect(totalAllSquadHolders).to.equal(2);
      expect(totalCommonNFTsStaked).to.equal(
        ADDR1_NFT_CNT -
        ADDR1_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR2_NFT_CNT -
        ADDR2_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT
      );
    });
    it("staked user1 NFTs count", async () => {
      const NFTs = await ggStaking.userStakedNFTs(addr1.address);
      expect(NFTs.length).to.equal(ADDR1_NFT_CNT);
    });
    it("staked user2 NFTs count", async () => {
      const NFTs = await ggStaking.userStakedNFTs(addr2.address);
      expect(NFTs.length).to.equal(ADDR2_NFT_CNT);
    });
  });
  describe("checked setting rewards", async () => {
    it("setRewardsPercent: the total rewards percent should be 100", async () => {
      await expect(ggStaking.setRewardsPercent(10, 10, 10)).to.be.revertedWith(
        "setRewardsPercent: the total rewards percent should be 100"
      );
    });
    it("depositReward: the amount should be greater than 0", async () => {
      await expect(ggStaking.depositReward(0)).to.be.revertedWith(
        "depositReward: the amount should be greater than 0"
      );
    });
    it("depositReward: the total rewards percent should be 100", async () => {
      await expect(ggStaking.depositReward(10)).to.be.revertedWith(
        "depositReward: the total rewards percent should be 100"
      );
    });
    it("checked setRewardsPercent success", async () => {
      await ggStaking.setRewardsPercent(
        LEGENDARY_REWARD_PERCENT,
        ALLSQUAD_REWARD_PERCENT,
        COMMON_REWARD_PERCENT
      );
      const legendaryRewardsPercent = await ggStaking.legendaryRewardsPercent();
      const allSquadRewardsPercent = await ggStaking.allSquadRewardsPercent();
      const commonRewardsPercent = await ggStaking.commonRewardsPercent();
      expect(legendaryRewardsPercent).to.equal(LEGENDARY_REWARD_PERCENT);
      expect(allSquadRewardsPercent).to.equal(ALLSQUAD_REWARD_PERCENT);
      expect(commonRewardsPercent).to.equal(COMMON_REWARD_PERCENT);
    });
    it("checked depositReward success", async () => {
      await ggStaking.depositReward("100000000000000000000000");
      const totalDepositCount = await ggStaking.totalDepositCount(); //1
      const totalRewardBalance = await ggStaking.totalRewardBalance(); ////100000000000000000000000
      expect(totalDepositCount).to.equal(1);
      expect(totalRewardBalance).to.equal("100000000000000000000000");
    });
    it("checked currentxxxReward", async() => {
      const currentLegendaryReward = await ggStaking.currentLegendaryReward();
      const currentAllSquadReward = await ggStaking.currentAllSquadReward();
      const currentCommonNFTReward = await ggStaking.currentCommonNFTReward();
      expect(currentLegendaryReward).to.equal("15000000000000000000000");
      expect(currentAllSquadReward).to.equal("22500000000000000000000");
      expect(currentCommonNFTReward).to.equal("526315789473684210526");
    });
  });
  describe("checked users pending rewards after first depositReward", async () => {
    it("checked first user pending rewards after first depositReward", async () => {
      const getPending = await ggStaking.getPending(addr1.address); //71184210526315789473684 = 0 + (45000 + 22500 + (10000/19*7))* 10^18
      expect(getPending).to.equal("71184210526315789473684");
    });
    it("checked second user pending rewards after first depositReward", async () => {
      const getPending = await ggStaking.getPending(addr2.address); //28815789473684210526315 = 0 + (0 + 22500 + (10000/19*12)) * 10^18
      expect(getPending).to.equal("28815789473684210526315");
    });
  });
  describe("checked users pending rewards after second depositReward", async () => {
    it("checked first user pending rewards after second depositReward", async () => {
      await ggStaking.depositReward("100000000000000000000000");
      const totalDepositCount = await ggStaking.totalDepositCount(); //1
      const totalRewardBalance = await ggStaking.totalRewardBalance(); ////100000000000000000000000
      expect(totalDepositCount).to.equal(2);
      expect(totalRewardBalance).to.equal("200000000000000000000000");
      const getPending = await ggStaking.getPending(addr1.address); //142368421052631578947368 = 71184210526315789473684 + (45000 + 22500 + (10000/19*7))* 10^18
      expect(getPending).to.equal("142368421052631578947368");
    });
    it("checked second user pending rewards after second depositReward", async () => {
      const getPending = await ggStaking.getPending(addr2.address); //57631578947368421052631 = 28815789473684210526315 + (0 + 22500 + (10000/19*12)) * 10^18
      expect(getPending).to.equal("57631578947368421052631");
    });
  });
  describe("checked unstake", async () => {
    it("NFT unstake: Empty Array", async () => {
      await expect(ggStaking.connect(addr1).unstake([])).to.be.revertedWith(
        "NFT unstake: Empty Array"
      );
    });
    it("NFT unstake: token not staked or incorrect token owner", async () => {
      await expect(ggStaking.connect(addr2).unstake([0, 1])).to.be.revertedWith(
        "NFT unstake: token not staked or incorrect token owner"
      );
    });
    it("NFT unstake: duplicate token ids in input params", async () => {
      await expect(ggStaking.connect(addr1).unstake([0, 0])).to.be.revertedWith(
        "NFT unstake: duplicate token ids in input params"
      );
    });
    it("checked unstake tokens success", async () => {
      await ggStaking.connect(addr1).unstake([0, 3]);
      const userInfo = await ggStaking.userInfos(addr1.address);
      expect(userInfo.totalNFTCountForHolder).to.equal(ADDR1_NFT_CNT - 2); //16
      expect(userInfo.isLegendaryStaker).to.equal(true);
      expect(userInfo.stakedLegendaryCountForHolder).to.equal(
        ADDR1_LEGENDARY_CNT - 1
      ); //2
      expect(userInfo.isAllSquadStaker).to.equal(true);
      expect(userInfo.commonNFTHolder).to.equal(true);
      expect(userInfo.commonNFTCountForHolder).to.equal(
        ADDR1_NFT_CNT - SQUAD_FEATURE_CNT - ADDR1_LEGENDARY_CNT - 1
      );
      const totalStakedGators = await ggStaking.totalStakedGators();
      const totalLegendaryStaked = await ggStaking.totalLegendaryStaked();
      const totalAllSquadHolders = await ggStaking.totalAllSquadHolders();
      const totalCommonNFTsStaked = await ggStaking.totalCommonNFTsStaked();
      expect(totalStakedGators).to.equal(ADDR1_NFT_CNT + ADDR2_NFT_CNT - 2);
      expect(totalLegendaryStaked).to.equal(
        ADDR1_LEGENDARY_CNT + ADDR2_LEGENDARY_CNT - 1
      );
      expect(totalAllSquadHolders).to.equal(2);
      expect(totalCommonNFTsStaked).to.equal(
        ADDR1_NFT_CNT -
        ADDR1_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR2_NFT_CNT -
        ADDR2_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT -
        1
      );
    });
  });
  describe("checked users pending rewards after 3rd depositReward", async () => {
    it("checked first user pending rewards after 3rd depositReward", async () => {
      await ggStaking.depositReward("200000000000000000000000");
      const totalDepositCount = await ggStaking.totalDepositCount(); //3
      const totalRewardBalance = await ggStaking.totalRewardBalance(); //400000000000000000000000
      expect(totalDepositCount).to.equal(3);
      expect(totalRewardBalance).to.equal("400000000000000000000000");
      const getPending = await ggStaking.getPending(addr1.address); //284035087719298245614035 = 142368421052631578947368 + (90000 + 45000 + (20000/18*6)) * 1000000000000000000
      expect(getPending).to.equal("284035087719298245614035");
    });
    it("checked second user pending rewards after 3rd depositReward", async () => {
      const getPending = await ggStaking.getPending(addr2.address); //115964912280701754385964 = 57631578947368421052631 + (0 + 45000 + (20000/18*12)) * 1000000000000000000
      expect(getPending).to.equal("115964912280701754385964");
    });
    it("checked currentxxxReward", async() => {
      const currentLegendaryReward = await ggStaking.currentLegendaryReward();
      const currentAllSquadReward = await ggStaking.currentAllSquadReward();
      const currentCommonNFTReward = await ggStaking.currentCommonNFTReward();
      expect(currentLegendaryReward).to.equal("45000000000000000000000");
      expect(currentAllSquadReward).to.equal("45000000000000000000000");
      expect(currentCommonNFTReward).to.equal("1111111111111111111111");
    });
  });
  describe("checked second unstake with user2", async () => {
    it("checked unstake tokens success and squad flag will be false", async () => {
      var tokenIds = [];
      for (var i = ADDR2_LEGENDARY_CNT; i < ADDR2_NFT_CNT; i++) {
        tokenIds.push(i + ADDR1_NFT_CNT);
      }
      await ggStaking.connect(addr2).unstake(tokenIds);
      let userInfo = await ggStaking.userInfos(addr2.address);
      expect(userInfo.totalNFTCountForHolder).to.equal(ADDR2_NFT_CNT - ADDR2_LEGENDARY_CNT - tokenIds.length); //0
      expect(userInfo.isLegendaryStaker).to.equal(false);
      expect(userInfo.stakedLegendaryCountForHolder).to.equal(0);
      expect(userInfo.isAllSquadStaker).to.equal(false);
      expect(userInfo.commonNFTHolder).to.equal(false);
      expect(userInfo.commonNFTCountForHolder).to.equal(ADDR2_NFT_CNT - ADDR2_LEGENDARY_CNT - tokenIds.length);  //0
      let totalStakedGators = await ggStaking.totalStakedGators();
      let totalLegendaryStaked = await ggStaking.totalLegendaryStaked();
      let totalAllSquadHolders = await ggStaking.totalAllSquadHolders();
      let totalCommonNFTsStaked = await ggStaking.totalCommonNFTsStaked();
      expect(totalStakedGators).to.equal(ADDR1_NFT_CNT + ADDR2_NFT_CNT - 2 - tokenIds.length);
      expect(totalLegendaryStaked).to.equal(
        ADDR1_LEGENDARY_CNT + ADDR2_LEGENDARY_CNT - 1
      );
      expect(totalAllSquadHolders).to.equal(1);
      expect(totalCommonNFTsStaked).to.equal(
        ADDR1_NFT_CNT -
        ADDR1_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR2_NFT_CNT -
        ADDR2_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT -
        1 + SQUAD_FEATURE_CNT -
        tokenIds.length
      ); 
      tokenIds = [];
      for (var i = ADDR2_LEGENDARY_CNT; i < ADDR2_NFT_CNT; i++) {
        tokenIds.push(i + ADDR1_NFT_CNT);
      }
      await ggStaking.connect(addr2).stake(tokenIds);
      tokenIds = [];
      for (var i = ADDR2_LEGENDARY_CNT; i < ADDR2_NFT_CNT; i = i + SQUAD_FEATURE_CNT) {
        tokenIds.push(i + ADDR1_NFT_CNT);
      }
      await ggStaking.connect(addr2).unstake(tokenIds);
      userInfo = await ggStaking.userInfos(addr2.address);
      expect(userInfo.totalNFTCountForHolder).to.equal(ADDR2_NFT_CNT - ADDR2_LEGENDARY_CNT - tokenIds.length); //17
      expect(userInfo.isLegendaryStaker).to.equal(false);
      expect(userInfo.stakedLegendaryCountForHolder).to.equal(0);
      expect(userInfo.isAllSquadStaker).to.equal(false);
      expect(userInfo.commonNFTHolder).to.equal(true);
      expect(userInfo.commonNFTCountForHolder).to.equal(ADDR2_NFT_CNT - ADDR2_LEGENDARY_CNT - tokenIds.length);  //17
      totalStakedGators = await ggStaking.totalStakedGators();
      totalLegendaryStaked = await ggStaking.totalLegendaryStaked();
      totalAllSquadHolders = await ggStaking.totalAllSquadHolders();
      totalCommonNFTsStaked = await ggStaking.totalCommonNFTsStaked();
      expect(totalStakedGators).to.equal(ADDR1_NFT_CNT + ADDR2_NFT_CNT - 2 - tokenIds.length);
      expect(totalLegendaryStaked).to.equal(
        ADDR1_LEGENDARY_CNT + ADDR2_LEGENDARY_CNT - 1
      );
      expect(totalAllSquadHolders).to.equal(1);
      expect(totalCommonNFTsStaked).to.equal(
        ADDR1_NFT_CNT -
        ADDR1_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR2_NFT_CNT -
        ADDR2_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT -
        1 + SQUAD_FEATURE_CNT -
        tokenIds.length
      );
    });
    it ("checked user1 pending rewards after second unstake", async() => {
      const getPending = await ggStaking.getPending(addr1.address);
      expect(getPending).to.equal("284035087719298245614035");
    });
    it ("checked user2 pending rewards after second unstake", async() => {
      const getPending = await ggStaking.getPending(addr2.address);
      expect(getPending).to.equal("115964912280701754385964");
    })
  });
  describe("checked claim", async () => {
    it("checked first user claim success", async () => {
      await ggStaking.connect(addr1).claim();
      const addr1UsdtBalance = await eg.balanceOf(addr1.address);
      expect(addr1UsdtBalance).to.equal("284035087719298245614035");
    });
    it("checked user1 pending rewards after user1 claim", async() => {
      const getPending = await ggStaking.getPending(addr1.address); 
      expect(getPending).to.equal(0);
    });
    it("checked user2 pending rewards after user1 claim", async() => {
      const getPending = await ggStaking.getPending(addr2.address); //115964912280701754385964
      expect(getPending).to.equal("115964912280701754385964");
    });
    it("checked second user claim success", async () => {
      await ggStaking.connect(addr2).claim();
      const addr2UsdtBalance = await eg.balanceOf(addr2.address);
      expect(addr2UsdtBalance).to.equal("115964912280701754385964");
    });
    it("checked user2 pending rewards after user2 claim", async() => {
      const getPending = await ggStaking.getPending(addr2.address); //0
      expect(getPending).to.equal(0);
    });
  });
  describe("checked claimFee setting", async() => {
    it("setClaimFee: amount should be smaller than 10", async () => {
      await expect(ggStaking.connect(owner).setClaimFee(20)).to.be.revertedWith(
        "setClaimFee: amount should be smaller than 10"
      )
    });
    it("setClaimFeeWallet: the claimFeeWallet must have a valid address", async () => {
      await expect(ggStaking.connect(owner).setClaimFeeWallet(ZERO_ADDRESS)).to.be.revertedWith(
        "setClaimFeeWallet: the claimFeeWallet must have a valid address"
      );
    });
    it("checked setClaimFeeWallet success", async () => {
      await ggStaking.connect(owner).setClaimFeeWallet(addr3.address);
      expect(await ggStaking.claimFeeWallet()).to.equal(addr3.address);
    });
    it("checked setClaimFee success", async () => {
      await ggStaking.connect(owner).setClaimFee(10);
      expect(await ggStaking.claimFee()).to.equal(10);
    });
  });
  describe("checked 4th depositReward", async () => {
    it("checked 4th depositReward success", async () => {
      await ggStaking.depositReward("100000000000000000000000");
      const totalDepositCount = await ggStaking.totalDepositCount(); //4
      const totalRewardBalance = await ggStaking.totalRewardBalance(); //500000000000000000000000
      expect(totalDepositCount).to.equal(4);
      expect(totalRewardBalance).to.equal("500000000000000000000000");
    });
    it("checked user1 pending rewards after 4th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr1.address); // 92608695652173913043478 = 0 + (45000 + 45000 + (10000 / 23 * 6)) * 1000000000000000000
      expect(getPending).to.equal("92608695652173913043478");
    });
    it("checked user2 pending rewards after 4th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr2.address); // 7391304347826086956522 = 0 + (0 + 0 + (10000 / 23 * 17)) * 1000000000000000000
      expect(getPending).to.equal("7391304347826086956522");
    });
    it("checked again user1 pending rewards after 4th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr1.address); // 92608695652173913043478
      expect(getPending).to.equal("92608695652173913043478");
    });
    it("checked again user2 pending rewards after 4th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr2.address); // 7391304347826086956522
      expect(getPending).to.equal("7391304347826086956522");
    });
  });
  describe("stake unstaked tokens again success", async () => {
    it("stake unstaked tokens for user1 again success", async () => {
      var tokenIds = [0,3];
      await ggStaking.connect(addr1).stake(tokenIds);
      const userInfo = await ggStaking.userInfos(addr1.address);
      expect(userInfo.totalNFTCountForHolder).to.equal(ADDR1_NFT_CNT);
      expect(userInfo.isLegendaryStaker).to.equal(true);
      expect(userInfo.stakedLegendaryCountForHolder).to.equal(
        ADDR1_LEGENDARY_CNT
      );
      expect(userInfo.isAllSquadStaker).to.equal(true);
      expect(userInfo.commonNFTHolder).to.equal(true);
      expect(userInfo.commonNFTCountForHolder).to.equal(
        ADDR1_NFT_CNT - SQUAD_FEATURE_CNT - ADDR1_LEGENDARY_CNT
      );
    });
    it("stake unstaked tokens for user2 again success", async () => {
      var tokenIds = [];
      for (var i = ADDR2_LEGENDARY_CNT; i < ADDR2_NFT_CNT; i = i + SQUAD_FEATURE_CNT) {
        tokenIds.push(i + ADDR1_NFT_CNT);
      }
      await ggStaking.connect(addr2).stake(tokenIds);
      const totalStakedGators = await ggStaking.totalStakedGators();
      const totalLegendaryStaked = await ggStaking.totalLegendaryStaked();
      const totalAllSquadHolders = await ggStaking.totalAllSquadHolders();
      const totalCommonNFTsStaked = await ggStaking.totalCommonNFTsStaked();
      expect(totalStakedGators).to.equal(ADDR1_NFT_CNT + ADDR2_NFT_CNT);
      expect(totalLegendaryStaked).to.equal(
        ADDR1_LEGENDARY_CNT + ADDR2_LEGENDARY_CNT
      );
      expect(totalAllSquadHolders).to.equal(2);
      expect(totalCommonNFTsStaked).to.equal(
        ADDR1_NFT_CNT -
        ADDR1_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR2_NFT_CNT -
        ADDR2_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT
      );
    });
  });
  describe("checked pending rewards after unstaked tokens again", async () => {
    it("checked user1 pending rewards", async () => {
      const getPending = await ggStaking.getPending(addr1.address); // 92608695652173913043478
      expect(getPending).to.equal("92608695652173913043478");
    });
    it("checked user2 pending rewards", async () => {
      const getPending = await ggStaking.getPending(addr2.address); // 7391304347826086956522
      expect(getPending).to.equal("7391304347826086956522");
    });
  });
  describe("checked second setting rewards", async () => {
    it("checked setRewardsPercent1 success", async () => {
      await ggStaking.setRewardsPercent(
        LEGENDARY_REWARD_PERCENT1,
        ALLSQUAD_REWARD_PERCENT1,
        COMMON_REWARD_PERCENT1
      );
      const legendaryRewardsPercent = await ggStaking.legendaryRewardsPercent();
      const allSquadRewardsPercent = await ggStaking.allSquadRewardsPercent();
      const commonRewardsPercent = await ggStaking.commonRewardsPercent();
      expect(legendaryRewardsPercent).to.equal(LEGENDARY_REWARD_PERCENT1);
      expect(allSquadRewardsPercent).to.equal(ALLSQUAD_REWARD_PERCENT1);
      expect(commonRewardsPercent).to.equal(COMMON_REWARD_PERCENT1);
    });
    it("checked 5th depositReward success", async () => {
      await ggStaking.depositReward("100000000000000000000000");
      const totalDepositCount = await ggStaking.totalDepositCount(); //5
      const totalRewardBalance = await ggStaking.totalRewardBalance(); ////600000000000000000000000
      expect(totalDepositCount).to.equal(5);
      expect(totalRewardBalance).to.equal("600000000000000000000000");
    });
    it("checked user1 pending rewards after 5th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr1.address); // 159977116704805491990846 = 92608695652173913043478 + (40000 + 20000 + (20000 / 19 * 7)) * 1000000000000000000
      expect(getPending).to.equal("159977116704805491990846");

    });
    it("checked user2 pending rewards after 5th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr2.address); // 40022883295194508009154 = 7391304347826086956522 + (0 + 20000 + (20000 / 19 * 12)) * 1000000000000000000
      expect(getPending).to.equal("40022883295194508009154");
    });
    it("checked user1 pending rewards after 5th depositReward again", async () => {
      const getPending = await ggStaking.getPending(addr1.address); 
      expect(getPending).to.equal("159977116704805491990846");

    });
    it("checked user2 pending rewards after 5th depositReward again", async () => {
      const getPending = await ggStaking.getPending(addr2.address); 
      expect(getPending).to.equal("40022883295194508009154");
    });
  });
  describe("checked second claim", async () => {
    it("checked first user claim success", async () => {
      await ggStaking.connect(addr1).claim();
    });
    it("checked first user usdt balance", async() => {
      const addr1UsdtBalance = await eg.balanceOf(addr1.address);   //284035087719298245614035 + 159977116704805491990846 * 0.9 = 428014492753623188405797
      expect(addr1UsdtBalance).to.equal("428014492753623188405797");
    })
    it("checked feeWallet usdt balance", async() => {
      const feeWalletUsdtBalance = await eg.balanceOf(addr3.address); //159977116704805491990846 * 0.1 = 15997711670480549199084
      expect(feeWalletUsdtBalance).to.equal("15997711670480549199084");
    });

    it("checked user1 pending rewards after user1 claim", async() => {
      const getPending = await ggStaking.getPending(addr1.address); 
      expect(getPending).to.equal(0);
    });
    it("checked second user claim success", async () => {
      await ggStaking.connect(addr2).claim();
    });
    it("checked second user usdt balance", async() => {
      const addr2UsdtBalance = await eg.balanceOf(addr2.address);
      expect(addr2UsdtBalance).to.equal("151985507246376811594203");  //115964912280701754385964 + 40022883295194508009154 * 0.9 = 151985507246376811594203
    });
    it("checked feeWallet usdt balance", async() => {
      const feeWalletUsdtBalance = await eg.balanceOf(addr3.address); //15997711670480549199084 + 40022883295194508009154 * 0.1 = 
      expect(feeWalletUsdtBalance).to.equal("19999999999999999999999");
    });
    it("checked user2 pending rewards after user2 claim", async() => {
      const getPending = await ggStaking.getPending(addr2.address); //0
      expect(getPending).to.equal(0);
    });
  });
  describe("checked unusedRewardPot", async() => {
    it("unstake user1 all of the legendary", async() => {
      var tokenIds = [];
      for(var i = 0; i < ADDR1_LEGENDARY_CNT; i++) {
        tokenIds.push(i);
      }
      await ggStaking.connect(addr1).unstake(tokenIds);
      const userInfo = await ggStaking.userInfos(addr1.address);
      expect(userInfo.totalNFTCountForHolder).to.equal(ADDR1_NFT_CNT - ADDR1_LEGENDARY_CNT);
      expect(userInfo.isLegendaryStaker).to.equal(false);
      expect(userInfo.stakedLegendaryCountForHolder).to.equal(
        0
      );
      expect(userInfo.isAllSquadStaker).to.equal(true);
      expect(userInfo.commonNFTHolder).to.equal(true);
      expect(userInfo.commonNFTCountForHolder).to.equal(
        ADDR1_NFT_CNT - SQUAD_FEATURE_CNT - ADDR1_LEGENDARY_CNT
      );

      const totalStakedGators = await ggStaking.totalStakedGators();
      const totalLegendaryStaked = await ggStaking.totalLegendaryStaked();
      const totalAllSquadHolders = await ggStaking.totalAllSquadHolders();
      const totalCommonNFTsStaked = await ggStaking.totalCommonNFTsStaked();
      expect(totalStakedGators).to.equal(ADDR1_NFT_CNT + ADDR2_NFT_CNT - ADDR1_LEGENDARY_CNT);
      expect(totalLegendaryStaked).to.equal(
        0
      );
      expect(totalAllSquadHolders).to.equal(2);
      expect(totalCommonNFTsStaked).to.equal(
        ADDR1_NFT_CNT -
        ADDR1_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR2_NFT_CNT -
        ADDR2_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT
      );
    });
    it("withdrawUnusedRewardPot: unusedRewardPot should be greater than 0", async() => {
      await expect(ggStaking.connect(owner).withdrawUnusedRewardPot()).to.be.revertedWith(
        "withdrawUnusedRewardPot: unusedRewardPot should be greater than 0"
      );
    });
    it("checked 6th depositReward success", async () => {
      await ggStaking.depositReward("100000000000000000000000");
      const totalDepositCount = await ggStaking.totalDepositCount(); //6
      const totalRewardBalance = await ggStaking.totalRewardBalance(); ////700000000000000000000000
      expect(totalDepositCount).to.equal(6);
      expect(totalRewardBalance).to.equal("700000000000000000000000");
    });
    it("checked user1 pending rewards after 6th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr1.address); // 0 + (0 + 20000 + (20000 / 19 * 7)) * 1000000000000000000 = 27368421052631578947369
      expect(getPending).to.equal("27368421052631578947369");
    });
    it("checked user2 pending rewards after 6th depositReward", async () => {
      const getPending = await ggStaking.getPending(addr2.address); // 0 + (0 + 20000 + (20000 / 19 * 12)) * 1000000000000000000 = 32631578947368421052631
      expect(getPending).to.equal("32631578947368421052631");
    });
    it("checked user1 pending rewards after 6th depositReward again", async () => {
      const getPending = await ggStaking.getPending(addr1.address); 
      expect(getPending).to.equal("27368421052631578947369");
    });
    it("checked user2 pending rewards after 6th depositReward again", async () => {
      const getPending = await ggStaking.getPending(addr2.address); 
      expect(getPending).to.equal("32631578947368421052631");
    });
    it("checked unusedRewardPot after 6th depositReward", async () => {
      const unusedRewardPot = await ggStaking.unusedRewardPot();
      expect(unusedRewardPot).to.equal("40000000000000000000000");
    });
    it("checked withdrawUnusedRewardPot success", async() => {
      await ggStaking.connect(owner).withdrawUnusedRewardPot();
      const unusedRewardPot = await ggStaking.connect(owner).unusedRewardPot();
      expect(unusedRewardPot).to.equal("0");
      const newOwnerUsdtBalance = await eg.balanceOf(owner.address);
      expect(newOwnerUsdtBalance).to.equal("99340000000000000000000000");   //99300000000000000000000000  + 40000000000000000000000 = 99340000000000000000000000
    });
    it("restake user1 legendary nfts", async() => {
      var tokenIds = [];
      for(var i = 0; i < ADDR1_LEGENDARY_CNT; i++) {
        tokenIds.push(i);
      }
      await ggStaking.connect(addr1).stake(tokenIds);
    });
  });
  describe("checked setTokenInfo and stake", async () => {
    it("checked second setTokenInfo success", async () => {
      var ids = [], isLegendaries = [], squadIds = [];
      for (var i = 0; i < ADDR1_LEGENDARY_CNT1; i++) {
        ids.push(ADDR1_NFT_CNT + ADDR2_NFT_CNT + i);
        isLegendaries.push(1);
        squadIds.push(i % SQUAD_FEATURE_CNT);
      }
      for (var i = ADDR1_LEGENDARY_CNT1; i < ADDR1_NFT_CNT; i++) {
        ids.push( ADDR1_NFT_CNT + ADDR2_NFT_CNT + i);
        isLegendaries.push(0);
        squadIds.push(i % SQUAD_FEATURE_CNT);
      }
      for (var i = 0; i < ADDR2_LEGENDARY_CNT1; i++) {
        ids.push(i + ADDR1_NFT_CNT + ADDR2_NFT_CNT + ADDR1_NFT_CNT1);
        isLegendaries.push(1);
        squadIds.push(i % SQUAD_FEATURE_CNT);
      }
      for (var i = ADDR2_LEGENDARY_CNT1; i < ADDR2_NFT_CNT1; i++) {
        ids.push(i + ADDR1_NFT_CNT + ADDR2_NFT_CNT + ADDR1_NFT_CNT1);
        isLegendaries.push(0);
        squadIds.push(i % SQUAD_FEATURE_CNT);
      }
      await ggStaking.connect(owner).setTokenInfo(ids, isLegendaries, squadIds);
    });
    it("stake tokens success", async () => {
      var tokenIds = [];
      for (var i = 0; i < ADDR1_NFT_CNT1; i++) {
        tokenIds.push(i + ADDR1_NFT_CNT + ADDR2_NFT_CNT);
      }
      await ggStaking.connect(addr1).stake(tokenIds);
      const userInfo = await ggStaking.userInfos(addr1.address);
      expect(userInfo.totalNFTCountForHolder).to.equal(ADDR1_NFT_CNT + ADDR1_NFT_CNT1);
      expect(userInfo.isLegendaryStaker).to.equal(true);
      expect(userInfo.stakedLegendaryCountForHolder).to.equal(
        ADDR1_LEGENDARY_CNT + ADDR1_LEGENDARY_CNT1
      );
      expect(userInfo.isAllSquadStaker).to.equal(true);
      expect(userInfo.commonNFTHolder).to.equal(true);
      expect(userInfo.commonNFTCountForHolder).to.equal(
        ADDR1_NFT_CNT - SQUAD_FEATURE_CNT - ADDR1_LEGENDARY_CNT + ADDR1_NFT_CNT1 - ADDR1_LEGENDARY_CNT1
      );
      tokenIds = [];
      for (var i = 0; i < ADDR2_NFT_CNT1; i++) {
        tokenIds.push(i + ADDR1_NFT_CNT + ADDR2_NFT_CNT + ADDR1_NFT_CNT1);
      }
      await ggStaking.connect(addr2).stake(tokenIds);
      const totalStakedGators = await ggStaking.totalStakedGators();
      const totalLegendaryStaked = await ggStaking.totalLegendaryStaked();
      const totalAllSquadHolders = await ggStaking.totalAllSquadHolders();
      const totalCommonNFTsStaked = await ggStaking.totalCommonNFTsStaked();
      expect(totalStakedGators).to.equal(ADDR1_NFT_CNT + ADDR2_NFT_CNT + ADDR1_NFT_CNT1 + ADDR2_NFT_CNT1);
      expect(totalLegendaryStaked).to.equal(
        ADDR1_LEGENDARY_CNT + ADDR2_LEGENDARY_CNT + ADDR1_LEGENDARY_CNT1 + ADDR2_LEGENDARY_CNT1
      );
      expect(totalAllSquadHolders).to.equal(2);
      expect(totalCommonNFTsStaked).to.equal(
        ADDR1_NFT_CNT -
        ADDR1_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR1_NFT_CNT1 -
        ADDR1_LEGENDARY_CNT1 +
        ADDR2_NFT_CNT -
        ADDR2_LEGENDARY_CNT -
        SQUAD_FEATURE_CNT +
        ADDR2_NFT_CNT1 -
        ADDR2_LEGENDARY_CNT1
      );
    });
  });  
});
