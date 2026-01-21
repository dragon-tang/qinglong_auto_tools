try {
    let obj = JSON.parse($response.body);

    // 添加日志：记录请求信息
    //console.log('[Duolingo Script] Processing batch response');
    //console.log('[Duolingo Script] Responses count:', obj.responses ? obj.responses.length : 0);

    if (!obj.responses || obj.responses.length < 2 || (obj.responses[0].headers && 'etag' in obj.responses[0].headers)); // skip
    else {
        const now = Math.floor(Date.now() / 1000);

        // 添加日志：记录响应体大小
        const responseBodySize = obj.responses[0].body ? obj.responses[0].body.length : 0;
        //console.log('[Duolingo Script] Response body size:', responseBodySize, 'bytes');

        let userdata = JSON.parse(obj.responses[0].body);

        // 添加日志：记录修改前的状态
        //console.log('[Duolingo Script] Before modification:');
        //console.log('  subscriberLevel:', userdata.subscriberLevel);
        //console.log('  shopItems count:', userdata.shopItems ? userdata.shopItems.length : 0);
        //console.log('  has gold_subscription:', userdata.shopItems ? userdata.shopItems.some(item => item.id === 'gold_subscription') : false);

        // 原始的VIP修改逻辑
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
        if (!userdata.timerBoostConfig) userdata.timerBoostConfig = {};
        userdata.timerBoostConfig.hasFreeTimerBoost = true;

        // 添加日志：记录修改后的状态
        //console.log('[Duolingo Script] After modification:');
        //console.log('  subscriberLevel:', userdata.subscriberLevel);
        //console.log('  shopItems count:', userdata.shopItems.length);
        //console.log('  has gold_subscription:', userdata.shopItems.some(item => item.id === 'gold_subscription'));

        obj.responses[0].body = JSON.stringify(userdata);
        //console.log('[Duolingo Script] Modification completed successfully');
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    //console.log('[Duolingo Script] Error:', e.message);
    $done({});
}
