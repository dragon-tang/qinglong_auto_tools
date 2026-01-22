try {
    let obj = JSON.parse($response.body);

    if (!obj.responses || obj.responses.length < 2 || (obj.responses[0].headers && 'etag' in obj.responses[0].headers)) {
        $done({}); // 保持简洁，不符合条件直接结束
    } else {
        const now = Math.floor(Date.now() / 1000);
        let userdata = JSON.parse(obj.responses[0].body);

        // --- 1. 基础权限提升 (MAX 核心覆盖) ---
        userdata.hasPlus = true;
        userdata.isPlus = true;
        userdata.hasMax = true;           // 补全：显式 Max 标记
        userdata.isMax = true;            // 补全：显式 Max 标记
        userdata.subscriberLevel = 'MAX'; 
        userdata.plusStatus = 'MAX';      // 补全：状态字符串
        userdata.canUsePlusHearts = true;
        userdata.canUseVideoCall = true;  // 补全：开启 Max 视频通话功能

        // --- 2. 注入订阅对象 (清理后注入) ---
        if (!userdata.shopItems) userdata.shopItems = [];
        
        // 过滤掉所有现有的订阅项，确保注入的 Max 权限是唯一的
        userdata.shopItems = userdata.shopItems.filter(item => !item.id.includes('subscription'));

        const expiration = now + 31536000; // 一年后
        
        // 注入 Super 订阅
        userdata.shopItems.push({
            id: 'gold_subscription',
            purchaseDate: now - 172800,
            purchasePrice: 0,
            subscriptionInfo: {
                expectedExpiration: expiration,
                productId: "com.duolingo.DuolingoMobile.subscription.Gold.TwelveMonth.24Q2Max.168",
                renewer: 'APPLE',
                renewing: true,
                tier: 'twelve_month',
                type: 'gold'
            }
        });

        // 注入 Max 订阅
        userdata.shopItems.push({
            id: 'max_subscription',
            purchaseDate: now - 172800,
            purchasePrice: 0,
            subscriptionInfo: {
                expectedExpiration: expiration,
                productId: "com.duolingo.DuolingoMobile.subscription.Max.TwelveMonth",
                renewer: 'APPLE',
                renewing: true,
                tier: 'twelve_month',
                type: 'max'
            }
        });

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

        // --- 4. 强制开启 A/B 测试实验组 (增强匹配) ---
        if (userdata.experiments) {
            // 增加 immersive (沉浸式角色扮演) 和 video_call (视频通话)
            const aiKeys = ["max_subscription", "roleplay", "explain_my_answer", "ai_service", "immersive", "video_call"];
            Object.keys(userdata.experiments).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (aiKeys.some(k => lowerKey.includes(k))) {
                    userdata.experiments[key] = {
                        eligible: true,
                        treated: true,
                        params: { 
                            "is_enabled": "true", 
                            "should_show_entry": "true",
                            "is_in_treatment": "true" 
                        }
                    };
                }
            });
        }

        // --- 5. XP Boost 逻辑 (类型兼容性优化) ---
        const arg = (typeof $argument !== 'undefined') ? $argument : {};
        const xpBoostEnabled = arg.xp_boost === "true" || arg.xp_boost === true;
        const xpMultiplier = parseInt(arg.multiplier) || 2;

        if (xpBoostEnabled) {
            // 移除旧的 boost 防止叠加
            userdata.shopItems = userdata.shopItems.filter(item => item.id !== 'xp_boost_stackable');
            userdata.shopItems.push({
                id: 'xp_boost_stackable',
                purchaseDate: now,
                expectedExpirationDate: now + 3600,
                purchasePrice: 0,
                xpBoostMultiplier: xpMultiplier
            });
        }

        // --- 6. 其它配置 ---
        if (!userdata.timerBoostConfig) userdata.timerBoostConfig = {};
        userdata.timerBoostConfig.hasFreeTimerBoost = true;

        obj.responses[0].body = JSON.stringify(userdata);
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({});
}
