try {
    let obj = JSON.parse($response.body);
    // 移除了 etag 检查，只保留 responses 基本检查
    if (!obj.responses || obj.responses.length < 2); // skip
    else {
        const now = Math.floor(Date.now() / 1000);

        // 优化：使用流式处理，避免多次完整解析大JSON
        let userdata;
        try {
            userdata = JSON.parse(obj.responses[0].body);
        } catch (e) {
            // 如果解析失败，直接跳过
            $done({});
            return;
        }

        if (!userdata.shopItems) userdata.shopItems = [];
        const hasGold = userdata.shopItems.some(item => item.id === 'gold_subscription');
        if (!hasGold)
            userdata.shopItems.push({
                id: 'gold_subscription',
                purchaseDate: now - 172800,
                purchasePrice: 0,
                subscriptionInfo: {
                    expectedExpiration: now + 31536000,
                    productId: "com.duolingo.DuolingoMobile.subscription.Gold.TwelveMonth.24Q2Max.168",
                    renewer: 'APPLE',
                    renewing: true,
                    tier: 'twelve_month',
                    type: 'gold'
                }
            });
        userdata.subscriberLevel = 'GOLD';
        if (!userdata.trackingProperties) userdata.trackingProperties = {};
        const premiumFeatures = [
            "has_item_immersive_subscription",
            "has_item_premium_subscription",
            "has_item_live_subscription",
            "has_item_gold_subscription",
            "has_item_max_subscription"
        ];
        premiumFeatures.forEach(p => userdata.trackingProperties[p] = true);
        const xpBoostEnabled = $argument.xp_boost;
        const xpMultiplier = parseInt($argument.multiplier);
        if (xpBoostEnabled) {
            let foundXpBoost = false;
            for (let i = 0; i < userdata.shopItems.length; i++) {
                if (userdata.shopItems[i].id === 'xp_boost_stackable') {
                    userdata.shopItems[i].purchaseDate = now;
                    userdata.shopItems[i].expectedExpirationDate = now + 3600;
                    userdata.shopItems[i].xpBoostMultiplier = xpMultiplier;
                    foundXpBoost = true;
                    break;
                }
            }
            if (!foundXpBoost)
                userdata.shopItems.push({
                    id: 'xp_boost_stackable',
                    purchaseDate: now,
                    expectedExpirationDate: now + 3600,
                    purchasePrice: 0,
                    xpBoostMultiplier: xpMultiplier
                });
        }

        // 优化：检查timerBoostConfig是否存在
        if (!userdata.timerBoostConfig) userdata.timerBoostConfig = {};
        userdata.timerBoostConfig.hasFreeTimerBoost = true;

        // 优化：只序列化修改后的userdata，而不是整个obj
        obj.responses[0].body = JSON.stringify(userdata);
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    // 优化：添加错误日志以便调试
    console.log('Script error: ' + e.message);
    $done({});
}
