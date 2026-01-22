try {
    let obj = JSON.parse($response.body);

    // 添加日志：记录请求信息
    //console.log('[Duolingo Script] Processing batch response');

    if (!obj.responses || obj.responses.length < 2 || (obj.responses[0].headers && 'etag' in obj.responses[0].headers)) {
        // skip
    } else {
        const now = Math.floor(Date.now() / 1000);
        let userdata = JSON.parse(obj.responses[0].body);

        // --- 1. 基础权限提升 (MAX 核心) ---
        userdata.hasPlus = true;
        userdata.isPlus = true;
        userdata.subscriberLevel = 'MAX'; // 修改为 MAX 级别
        userdata.canUsePlusHearts = true;

        if (!userdata.shopItems) userdata.shopItems = [];

        // --- 2. 注入 Super & Max 订阅对象 ---
        const hasGold = userdata.shopItems.some(item => item.id === 'gold_subscription');
        if (!hasGold) {
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
        }

        const hasMax = userdata.shopItems.some(item => item.id === 'max_subscription');
        if (!hasMax) {
            userdata.shopItems.push({
                id: 'max_subscription',
                purchaseDate: now - 172800,
                purchasePrice: 0,
                subscriptionInfo: {
                    expectedExpiration: now + 31536000,
                    productId: "com.duolingo.DuolingoMobile.subscription.Max.TwelveMonth",
                    renewer: 'APPLE',
                    renewing: true,
                    tier: 'twelve_month',
                    type: 'max'
                }
            });
        }

        // --- 3. 追踪属性补全 ---
        if (!userdata.trackingProperties) userdata.trackingProperties = {};
        const premiumFeatures = [
            "has_item_immersive_subscription",
            "has_item_premium_subscription",
            "has_item_live_subscription",
            "has_item_gold_subscription",
            "has_item_max_subscription"
        ];
        premiumFeatures.forEach(p => userdata.trackingProperties[p] = true);

        // --- 4. 强制开启 A/B 测试实验组 (解锁 AI 功能 UI 入口) ---
        if (userdata.experiments) {
            const aiKeys = ["max_subscription", "roleplay", "explain_my_answer", "ai_service"];
            Object.keys(userdata.experiments).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (aiKeys.some(k => lowerKey.includes(k))) {
                    userdata.experiments[key] = {
                        eligible: true,
                        treated: true,
                        params: { "is_enabled": "true", "should_show_entry": "true" }
                    };
                }
            });
        }

        // --- 5. XP Boost 逻辑 (保留并修正) ---
        const xpBoostEnabled = $argument && $argument.xp_boost;
        const xpMultiplier = $argument ? parseInt($argument.multiplier) : 2;
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
            if (!foundXpBoost) {
                userdata.shopItems.push({
                    id: 'xp_boost_stackable',
                    purchaseDate: now,
                    expectedExpirationDate: now + 3600,
                    purchasePrice: 0,
                    xpBoostMultiplier: xpMultiplier
                });
            }
        }

        // --- 6. 其他配置 ---
        if (!userdata.timerBoostConfig) userdata.timerBoostConfig = {};
        userdata.timerBoostConfig.hasFreeTimerBoost = true;

        obj.responses[0].body = JSON.stringify(userdata);
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    //console.log('[Duolingo Script] Error:', e.message);
    $done({});
}
