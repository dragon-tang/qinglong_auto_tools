try {
    let body = $response.body;

    // 检查是否是batch响应
    if (!body.includes('"responses"')) {
        $done({});
        return;
    }

    // 使用字符串替换而不是JSON解析，避免处理大响应体
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
        const now = Math.floor(Date.now() / 1000);
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

        // 在 shopItems 数组中插入
        const shopItemsPattern = /"shopItems"\s*:\s*\[/;
        if (shopItemsPattern.test(body)) {
            body = body.replace(shopItemsPattern, `"shopItems":[${JSON.stringify(goldSub)},`);
        }
    }

    $done({ body: body });
} catch (e) {
    $done({});
}
