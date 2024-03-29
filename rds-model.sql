SET foreign_key_checks = 0;

DROP TABLE IF EXISTS vendors;
CREATE TABLE `vendors` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS apps;
CREATE TABLE `apps` (
  `id` varchar(50) NOT NULL,
  `vendor_id` varchar(50) NOT NULL,
  `user_id` varchar(128) DEFAULT NULL,
  `user_email` varchar(128) DEFAULT NULL,
  `current_version` varchar(50) DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `type` enum('reader','application','writer') NOT NULL DEFAULT 'reader',
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
  `default_bucket_stage` enum('in','out') DEFAULT NULL,
  `forward_token` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `ui_options` json DEFAULT NULL,
  `test_configuration` json DEFAULT NULL,
  `configuration_schema` json DEFAULT NULL,
  `networking` enum('dataIn','dataOut') DEFAULT NULL,
  `actions` json DEFAULT NULL,
  `fees` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `limits` text,
  `logger` enum('standard','gelf') NOT NULL DEFAULT 'standard',
  `is_approved` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS app_versions;
CREATE TABLE `app_versions` (
  `app_id` varchar(50) NOT NULL,
  `version` varchar(50) NOT NULL,
  `user_id` varchar(128) DEFAULT NULL,
  `user_email` varchar(128) DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `type` enum('reader','application','writer') NOT NULL DEFAULT 'reader',
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
  `default_bucket_stage` enum('in','out') DEFAULT NULL,
  `forward_token` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `ui_options` json DEFAULT NULL,
  `test_configuration` json DEFAULT NULL,
  `configuration_schema` json DEFAULT NULL,
  `networking` enum('dataIn','dataOut') DEFAULT NULL,
  `actions` json DEFAULT NULL,
  `fees` tinyint(1) unsigned NOT NULL DEFAULT '0',
  `limits` text,
  `logger` enum('standard','gelf') NOT NULL DEFAULT 'standard',
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`app_id`,`version`),
  CONSTRAINT `app_versions_ibfk_1` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

SET foreign_key_checks = 1;