program flash_markets.aleo {
    const OPEN: u8 = 0u8;
    const CLOSED: u8 = 1u8;
    const RESOLVED: u8 = 2u8;
    const VOID: u8 = 3u8;
    const SINGLETON_KEY: u8 = 0u8;
    const FEE_BPS: u64 = 0u64;
    const BPS_DENOM: u64 = 10000u64;

    record Bet {
        owner: address,
        market_id: u64,
        side_yes: bool,
        amount: u64,
        claimed: bool
    }

    mapping admin: u8 => address;
    mapping active_market_id: u8 => u64;
    mapping market_status: u64 => u8;
    mapping start_ts: u64 => u64;
    mapping end_ts: u64 => u64;
    mapping close_ts: u64 => u64;
    mapping start_price_e8: u64 => u64;
    mapping end_price_e8: u64 => u64;
    mapping outcome_yes: u64 => bool;
    mapping yes_total_public: u64 => u64;
    mapping no_total_public: u64 => u64;
    mapping sentiment_bps: u64 => i32;

    async transition initialize_admin(admin_address: address) -> Future {
        return async {
            assert_eq(admin.contains(SINGLETON_KEY), false);
            admin.set(SINGLETON_KEY, admin_address);
        };
    }

    async transition create_round(
        market_id: u64,
        start_time: u64,
        end_time: u64,
        close_time: u64,
        start_price: u64
    ) -> Future {
        return async {
            let admin_address: address = admin.get(SINGLETON_KEY);
            assert_eq(self.caller, admin_address);

            if active_market_id.contains(SINGLETON_KEY) {
                let current_market: u64 = active_market_id.get(SINGLETON_KEY);
                let current_status: u8 = market_status.get_or_use(current_market, VOID);
                assert_eq(current_status == OPEN || current_status == CLOSED, false);
            };

            assert_eq(start_time < close_time, true);
            assert_eq(close_time < end_time, true);

            active_market_id.set(SINGLETON_KEY, market_id);
            market_status.set(market_id, OPEN);
            start_ts.set(market_id, start_time);
            end_ts.set(market_id, end_time);
            close_ts.set(market_id, close_time);
            start_price_e8.set(market_id, start_price);
            yes_total_public.set(market_id, 0u64);
            no_total_public.set(market_id, 0u64);
        };
    }

    transition place_bet(market_id: u64, side_yes: bool, amount: u64) -> Bet {
        assert_eq(amount >= 1u64, true);

        // NOTE: In MVP, oracle script must only open one market at a time.
        let active_id: u64 = active_market_id.get_or_use(SINGLETON_KEY, 0u64);
        assert_eq(active_id, market_id);

        // NOTE: Full settlement requires stake escrow integration with credits.aleo.
        return Bet {
            owner: self.caller,
            market_id,
            side_yes,
            amount,
            claimed: false
        };
    }

    async transition close_round(market_id: u64) -> Future {
        return async {
            let admin_address: address = admin.get(SINGLETON_KEY);
            assert_eq(self.caller, admin_address);
            assert_eq(market_status.get_or_use(market_id, VOID), OPEN);
            market_status.set(market_id, CLOSED);
        };
    }

    async transition resolve_round(
        market_id: u64,
        end_price: u64,
        yes_total: u64,
        no_total: u64
    ) -> Future {
        return async {
            let admin_address: address = admin.get(SINGLETON_KEY);
            assert_eq(self.caller, admin_address);
            assert_eq(market_status.get_or_use(market_id, VOID), CLOSED);

            let start_price: u64 = start_price_e8.get(market_id);
            let yes_wins: bool = end_price > start_price;
            let pool_sum: u64 = yes_total + no_total;
            let sentiment: i32 = pool_sum == 0u64
                ? 0i32
                : ((yes_total as i128 - no_total as i128) * 10000i128 / pool_sum as i128) as i32;

            end_price_e8.set(market_id, end_price);
            outcome_yes.set(market_id, yes_wins);
            yes_total_public.set(market_id, yes_total);
            no_total_public.set(market_id, no_total);
            sentiment_bps.set(market_id, sentiment);
            market_status.set(market_id, RESOLVED);
        };
    }

    async transition void_round(market_id: u64) -> Future {
        return async {
            let admin_address: address = admin.get(SINGLETON_KEY);
            assert_eq(self.caller, admin_address);
            let status: u8 = market_status.get_or_use(market_id, VOID);
            assert_eq(status == RESOLVED, false);
            market_status.set(market_id, VOID);
        };
    }

    transition claim_reward(bet: Bet) -> (u64, Bet) {
        assert_eq(bet.owner, self.caller);
        assert_eq(bet.claimed, false);

        let status: u8 = market_status.get_or_use(bet.market_id, VOID);
        let is_void: bool = status == VOID;

        let yes_pool: u64 = yes_total_public.get_or_use(bet.market_id, 0u64);
        let no_pool: u64 = no_total_public.get_or_use(bet.market_id, 0u64);
        let total_pool: u64 = yes_pool + no_pool;
        let winning_side_yes: bool = outcome_yes.get_or_use(bet.market_id, false);
        let winning_pool: u64 = winning_side_yes ? yes_pool : no_pool;

        let gross: u64 = is_void
            ? bet.amount
            : (winning_pool == 0u64
                ? 0u64
                : (bet.side_yes == winning_side_yes
                    ? (bet.amount * total_pool) / winning_pool
                    : 0u64));

        let fee: u64 = (gross * FEE_BPS) / BPS_DENOM;
        let payout: u64 = gross - fee;

        let claimed_bet: Bet = Bet {
            owner: bet.owner,
            market_id: bet.market_id,
            side_yes: bet.side_yes,
            amount: bet.amount,
            claimed: true
        };

        return (payout, claimed_bet);
    }
}
