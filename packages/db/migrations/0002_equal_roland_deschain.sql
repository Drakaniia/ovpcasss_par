CREATE TABLE `rate_limit_counters` (
	`bucket` text NOT NULL,
	`window_start` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`bucket`, `window_start`)
);
