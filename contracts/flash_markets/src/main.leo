// Status codes: OPEN=0u8, CLOSED=1u8, RESOLVED=2u8, VOID=3u8

program flashmarketsam2.aleo {

    struct PositionKey {
        market_id: u64,
        bettor: address,
        side_yes: bool,
    }

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
    mapping position_amount: PositionKey => u64;
    mapping position_claimed: PositionKey => bool;

    async transition initialize_admin(admin_address: address) -> Future {
        return finalize_initialize_admin(admin_address);
    }

    async function finalize_initialize_admin(public admin_address: address) {
        assert_eq(Mapping::contains(admin, 0u8), false);
        Mapping::set(admin, 0u8, admin_address);
    }

    async transition create_round(
        market_id: u64,
        start_time: u64,
        end_time: u64,
        close_time: u64,
        start_price: u64
    ) -> Future {
        return finalize_create_round(self.caller, market_id, start_time, end_time, close_time, start_price);
    }

    async function finalize_create_round(
        public caller: address,
        public market_id: u64,
        public start_time: u64,
        public end_time: u64,
        public close_time: u64,
        public start_price: u64
    ) {
        let admin_address: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_address);

        if Mapping::contains(active_market_id, 0u8) {
            let current_market: u64 = Mapping::get(active_market_id, 0u8);
            let current_status: u8 = Mapping::get_or_use(market_status, current_market, 3u8);
            assert_eq(current_status == 0u8 || current_status == 1u8, false);
        }

        assert_eq(start_time < close_time, true);
        assert_eq(close_time < end_time, true);

        Mapping::set(active_market_id, 0u8, market_id);
        Mapping::set(market_status, market_id, 0u8);
        Mapping::set(start_ts, market_id, start_time);
        Mapping::set(end_ts, market_id, end_time);
        Mapping::set(close_ts, market_id, close_time);
        Mapping::set(start_price_e8, market_id, start_price);
        Mapping::set(yes_total_public, market_id, 0u64);
        Mapping::set(no_total_public, market_id, 0u64);
    }

    async transition place_bet(market_id: u64, side_yes: bool, amount: u64) -> Future {
        assert_eq(amount >= 1u64, true);
        return finalize_place_bet(self.caller, market_id, side_yes, amount);
    }

    async function finalize_place_bet(
        public caller: address,
        public market_id: u64,
        public side_yes: bool,
        public amount: u64
    ) {
        let status: u8 = Mapping::get_or_use(market_status, market_id, 3u8);
        assert_eq(status, 0u8);
        let active_id: u64 = Mapping::get(active_market_id, 0u8);
        assert_eq(active_id, market_id);
        let position: PositionKey = PositionKey {
            market_id,
            bettor: caller,
            side_yes
        };
        let prior_position_amount: u64 = Mapping::get_or_use(position_amount, position, 0u64);
        Mapping::set(position_amount, position, prior_position_amount + amount);
        Mapping::set(position_claimed, position, false);

        if side_yes {
            let yes_before: u64 = Mapping::get_or_use(yes_total_public, market_id, 0u64);
            Mapping::set(yes_total_public, market_id, yes_before + amount);
        } else {
            let no_before: u64 = Mapping::get_or_use(no_total_public, market_id, 0u64);
            Mapping::set(no_total_public, market_id, no_before + amount);
        }
    }

    async transition close_round(market_id: u64) -> Future {
        return finalize_close_round(self.caller, market_id);
    }

    async function finalize_close_round(public caller: address, public market_id: u64) {
        let admin_address: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_address);
        assert_eq(Mapping::get_or_use(market_status, market_id, 3u8), 0u8);
        Mapping::set(market_status, market_id, 1u8);
    }

    async transition resolve_round(market_id: u64, end_price: u64) -> Future {
        return finalize_resolve_round(self.caller, market_id, end_price);
    }

    async function finalize_resolve_round(
        public caller: address,
        public market_id: u64,
        public end_price: u64
    ) {
        let admin_address: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_address);
        assert_eq(Mapping::get_or_use(market_status, market_id, 3u8), 1u8);

        let sp: u64 = Mapping::get(start_price_e8, market_id);
        let yes_total: u64 = Mapping::get_or_use(yes_total_public, market_id, 0u64);
        let no_total: u64 = Mapping::get_or_use(no_total_public, market_id, 0u64);
        let yes_wins: bool = end_price > sp;
        let pool_sum: u64 = yes_total + no_total;
        let safe_pool_sum: u64 = pool_sum == 0u64 ? 1u64 : pool_sum;
        let sentiment: i32 = pool_sum == 0u64
            ? 0i32
            : ((yes_total as i128 - no_total as i128) * 10000i128 / safe_pool_sum as i128) as i32;

        Mapping::set(end_price_e8, market_id, end_price);
        Mapping::set(outcome_yes, market_id, yes_wins);
        Mapping::set(sentiment_bps, market_id, sentiment);
        Mapping::set(market_status, market_id, 2u8);
    }

    async transition void_round(market_id: u64) -> Future {
        return finalize_void_round(self.caller, market_id);
    }

    async function finalize_void_round(public caller: address, public market_id: u64) {
        let admin_address: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_address);
        let status: u8 = Mapping::get_or_use(market_status, market_id, 3u8);
        assert_eq(status == 2u8, false);
        Mapping::set(market_status, market_id, 3u8);
    }

    async transition claim_reward(
        market_id: u64,
        side_yes: bool,
        reported_user_amount: u64,
        reported_yes_total: u64,
        reported_no_total: u64,
        reported_outcome_yes: bool,
        reported_status: u8
    ) -> (u64, Future) {
        assert_eq(reported_user_amount > 0u64, true);

        let is_void: bool = reported_status == 3u8;
        let winning_total: u64 = reported_outcome_yes ? reported_yes_total : reported_no_total;
        let pool_total: u64 = reported_yes_total + reported_no_total;
        let fee: u64 = (pool_total * 0u64) / 10000u64;
        let distributable_pool: u64 = pool_total - fee;
        let is_winner: bool = side_yes == reported_outcome_yes;
        let payout: u64 = is_void
            ? reported_user_amount
            : (is_winner && winning_total > 0u64)
                ? (reported_user_amount * distributable_pool) / winning_total
                : 0u64;

        return (
            payout,
            finalize_claim_reward(
                self.caller,
                market_id,
                side_yes,
                reported_user_amount,
                reported_yes_total,
                reported_no_total,
                reported_outcome_yes,
                reported_status
            )
        );
    }

    async function finalize_claim_reward(
        public caller: address,
        public market_id: u64,
        public side_yes: bool,
        public reported_user_amount: u64,
        public reported_yes_total: u64,
        public reported_no_total: u64,
        public reported_outcome_yes: bool,
        public reported_status: u8
    ) {
        let status: u8 = Mapping::get_or_use(market_status, market_id, 3u8);
        assert_eq(status, reported_status);
        assert_eq(status == 2u8 || status == 3u8, true);
        let position: PositionKey = PositionKey {
            market_id,
            bettor: caller,
            side_yes
        };
        let already_claimed: bool = Mapping::get_or_use(position_claimed, position, false);
        assert_eq(already_claimed, false);
        let onchain_user_amount: u64 = Mapping::get_or_use(position_amount, position, 0u64);
        assert_eq(onchain_user_amount, reported_user_amount);

        let onchain_yes_total: u64 = Mapping::get_or_use(yes_total_public, market_id, 0u64);
        let onchain_no_total: u64 = Mapping::get_or_use(no_total_public, market_id, 0u64);
        assert_eq(onchain_yes_total, reported_yes_total);
        assert_eq(onchain_no_total, reported_no_total);

        if status == 2u8 {
            let onchain_outcome_yes: bool = Mapping::get(outcome_yes, market_id);
            assert_eq(onchain_outcome_yes, reported_outcome_yes);
        }
        Mapping::set(position_claimed, position, true);
    }
}
