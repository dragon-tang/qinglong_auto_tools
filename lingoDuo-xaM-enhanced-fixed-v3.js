try {
    let obj = JSON.parse($response.body);
    const now = Math.floor(Date.now() / 1000);

    // 检查响应体大小，如果太大则使用优化处理
    const responseBodySize = obj.responses[0].body ? obj.responses[0].body.length : 0;
    const isLargeResponse = responseBodySize > 5000000; // 5MB阈值

    if (isLargeResponse) {
        // 对于大响应体（如英语课程的9.4MB），使用字符串替换避免超时
        let body = obj.responses[0].body;

        // 替换 subscriberLevel
        body = body.replace(/"subscriberLevel"\s*:\s*"[^"]*"/g, '"subscriberLevel":"GOLD"');

        // 替换 trackingProperties 中的 premium features
        const premiumFeatures = [
            'has_item_immersive_subscription',
            'has_item_premium_subscription',
            'has_item_live_subscription',
            'has_item_gold_subscription',
            'has_item_max_subscription'
        ];
        premiumFeatures.forEach(feature => {
            const pattern = new RegExp(`"${feature}"\\s*:\\s*false`, 'g');
            body = body.replace(pattern, `"${feature}":true`);
        });

        // 替换 hasFreeTimerBoost
        body = body.replace(/"hasFreeTimerBoost"\s*:\s*false/g, '"hasFreeTimerBoost":true');

        // 添加 gold_subscription（如果不存在）
        if (!body.includes('"id":"gold_subscription"')) {
            const goldSub = {
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
            };
            const shopItemsPattern = /"shopItems"\s*:\s*\[/;
            if (shopItemsPattern.test(body)) {
                body = body.replace(shopItemsPattern, `"shopItems":[${JSON.stringify(goldSub)},`);
            }
        }

        obj.responses[0].body = body;
    } else {
        // 对于正常大小的响应体（如粤语课程的214KB），使用原始逻辑
        let userdata = JSON.parse(obj.responses[0].body);
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
        userdata.timerBoostConfig.hasFreeTimerBoost = true;
        obj.responses[0].body = JSON.stringify(userdata);
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({});
}
