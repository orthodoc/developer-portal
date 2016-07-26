CREATE TABLE `vendors` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `apps` (
  `id` varchar(50) NOT NULL,
  `vendor_id` varchar(50) NOT NULL,
  `user_id` varchar(128) DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `type` varchar(50) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `image_tag` varchar(20) DEFAULT NULL,
  `short_description` text,
  `long_description` text,
  `license_url` varchar(255) DEFAULT NULL,
  `documentation_url` varchar(255) DEFAULT NULL,
  `required_memory` varchar(10) DEFAULT NULL,
  `process_timeout` int(10) unsigned DEFAULT NULL,
  `encryption` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `default_bucket` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `default_bucket_stage` enum('in','out') NOT NULL DEFAULT 'in',
  `forward_token` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `ui_options` json DEFAULT NULL,
  `test_configuration` json DEFAULT NULL,
  `configuration_schema` json DEFAULT NULL,
  `networking` enum('dataIn','dataOut') NOT NULL DEFAULT 'dataIn',
  `actions` json DEFAULT NULL,
  `fees` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `limits` text,
  `logger` enum('standard','gelf') NOT NULL DEFAULT 'standard',
  `is_approved` tinyint(1) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `apps_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;