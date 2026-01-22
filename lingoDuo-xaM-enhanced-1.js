try {
    let obj = JSON.parse($response.body);

    if (!obj.responses || obj.responses.length < 2 || (obj.responses[0].headers && 'etag' in obj.responses[0].headers)) {
        // skip
    } else {
        const now = Math.floor(Date.now() / 1000);
        let userdata = JSON.parse(obj.responses[0].body);

        // --- 1. 基础权限提升 (保留你测试成功的 GOLD 逻辑并增强) ---
        userdata.hasPlus = true;
        userdata.isPlus = true;
        userdata.hasMax = true;           // 档案显示 Max 标志的关键
        userdata.isMax = true;            // 权限判定
        userdata.subscriberLevel = 'GOLD'; // 建议改为 MAX，若不显示标志可改回 'GOLD'
        userdata.canUsePlusHearts = true;

        if (!userdata.shopItems) userdata.shopItems = [];
        
        // 检查并注入订阅 (使用你测试成功的 ID)
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

        // 额外注入一个 Max 订阅对象增加兼容性
        const hasMaxSub = userdata.shopItems.some(item => item.id === 'max_subscription');
        if (!hasMaxSub) {
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

        // --- 2. 追踪属性补全 ---
        if (!userdata.trackingProperties) userdata.trackingProperties = {};
        const premiumFeatures = [
            "has_item_immersive_subscription",
            "has_item_premium_subscription",
            "has_item_live_subscription",
            "has_item_gold_subscription",
            "has_item_max_subscription"
        ];
        premiumFeatures.forEach(p => userdata.trackingProperties[p] = true);

        // --- 3. 强制开启 A/B 测试 (这是解锁真正的 AI 角色扮演和解释答案的关键) ---
        if (userdata.experiments) {
            const aiKeys = ["max_subscription", "roleplay", "explain_my_answer", "ai_service", "badge"];
            Object.keys(userdata.experiments).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (aiKeys.some(k => lowerKey.includes(k))) {
                    userdata.experiments[key] = {
                        eligible: true,
                        treated: true,
                        params: { 
                            "is_enabled": "true", 
                            "should_show_entry": "true" 
                        }
                    };
                }
            });
        }

        // --- 4. XP Boost 逻辑 (保留你的原始逻辑) ---
        const arg = (typeof $argument !== 'undefined') ? $argument : {};
        const xpBoostEnabled = arg.xp_boost;
        const xpMultiplier = parseInt(arg.multiplier);
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

        // --- 5. 其它配置 ---
        if (!userdata.timerBoostConfig) userdata.timerBoostConfig = {};
        userdata.timerBoostConfig.hasFreeTimerBoost = true;

        obj.responses[0].body = JSON.stringify(userdata);
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({});
}
