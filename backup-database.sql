-- Sauvegarde de la base de données webrtc_visioconf
-- Créée le: 2025-09-25T07:27:49.401Z


-- Structure de la table _prisma_migrations
DROP TABLE IF EXISTS `_prisma_migrations`;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données de la table _prisma_migrations
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES ('9966fd19-2b85-4d43-8f65-c8e5f679ea8a', '3ac89d5f0f8b83ffa2bb581a43a068fc1be85cf7d7a9d7acb2852203b1b072b8', Wed Sep 24 2025 19:36:30 GMT+0000 (heure moyenne de Greenwich), '20250924193628_init', NULL, NULL, Wed Sep 24 2025 19:36:28 GMT+0000 (heure moyenne de Greenwich), 1);


-- Structure de la table chatmessage
DROP TABLE IF EXISTS `chatmessage`;
CREATE TABLE `chatmessage` (
  `id` varchar(191) NOT NULL,
  `meetingId` varchar(191) NOT NULL,
  `userId` varchar(191) DEFAULT NULL,
  `username` varchar(191) NOT NULL,
  `message` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'text',
  `timestamp` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `edited` tinyint(1) NOT NULL DEFAULT 0,
  `editedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ChatMessage_meetingId_idx` (`meetingId`),
  KEY `ChatMessage_timestamp_idx` (`timestamp`),
  CONSTRAINT `ChatMessage_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `instantmeeting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Structure de la table instantmeeting
DROP TABLE IF EXISTS `instantmeeting`;
CREATE TABLE `instantmeeting` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `hostUsername` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `endedAt` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `participantCount` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `InstantMeeting_status_idx` (`status`),
  KEY `InstantMeeting_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Structure de la table instantmeetingparticipant
DROP TABLE IF EXISTS `instantmeetingparticipant`;
CREATE TABLE `instantmeetingparticipant` (
  `id` varchar(191) NOT NULL,
  `meetingId` varchar(191) NOT NULL,
  `userId` varchar(191) DEFAULT NULL,
  `username` varchar(191) NOT NULL,
  `joinedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `leftAt` datetime(3) DEFAULT NULL,
  `isMuted` tinyint(1) NOT NULL DEFAULT 0,
  `isVideoEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `role` varchar(191) NOT NULL DEFAULT 'participant',
  PRIMARY KEY (`id`),
  KEY `InstantMeetingParticipant_meetingId_idx` (`meetingId`),
  KEY `InstantMeetingParticipant_userId_idx` (`userId`),
  CONSTRAINT `InstantMeetingParticipant_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `instantmeeting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Structure de la table meeting
DROP TABLE IF EXISTS `meeting`;
CREATE TABLE `meeting` (
  `id` varchar(191) NOT NULL,
  `ownerId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `password` varchar(191) DEFAULT NULL,
  `scheduledFor` datetime(3) NOT NULL,
  `durationMin` int(11) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'scheduled',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Meeting_ownerId_idx` (`ownerId`),
  CONSTRAINT `Meeting_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données de la table meeting
INSERT INTO `meeting` (`id`, `ownerId`, `title`, `description`, `password`, `scheduledFor`, `durationMin`, `status`, `createdAt`, `updatedAt`) VALUES ('252b4195-6ea3-4d07-8f9c-ca5b1fd4070b', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', 'Test Meeting', 'Test Description', '1234', Sat Sep 27 2025 22:01:00 GMT+0000 (heure moyenne de Greenwich), 60, 'scheduled', Wed Sep 24 2025 22:52:32 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:52:32 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `meeting` (`id`, `ownerId`, `title`, `description`, `password`, `scheduledFor`, `durationMin`, `status`, `createdAt`, `updatedAt`) VALUES ('4d009706-1660-4a90-b507-0f3daa0308dd', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', 'Test Communication', 'Test de communication Backend-Frontend', 'test123', Thu Sep 25 2025 22:53:32 GMT+0000 (heure moyenne de Greenwich), 60, 'scheduled', Wed Sep 24 2025 22:53:32 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:53:32 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `meeting` (`id`, `ownerId`, `title`, `description`, `password`, `scheduledFor`, `durationMin`, `status`, `createdAt`, `updatedAt`) VALUES ('d313c04c-62ee-4133-b20d-8141ce8b9450', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', 'cours', NULL, NULL, Fri Sep 26 2025 22:50:00 GMT+0000 (heure moyenne de Greenwich), 60, 'scheduled', Wed Sep 24 2025 22:50:47 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:50:47 GMT+0000 (heure moyenne de Greenwich));


-- Structure de la table meetingparticipant
DROP TABLE IF EXISTS `meetingparticipant`;
CREATE TABLE `meetingparticipant` (
  `id` varchar(191) NOT NULL,
  `meetingId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL DEFAULT 'participant',
  `joinedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `MeetingParticipant_meetingId_userId_key` (`meetingId`,`userId`),
  KEY `MeetingParticipant_userId_idx` (`userId`),
  CONSTRAINT `MeetingParticipant_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `meeting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MeetingParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Structure de la table messagereaction
DROP TABLE IF EXISTS `messagereaction`;
CREATE TABLE `messagereaction` (
  `id` varchar(191) NOT NULL,
  `messageId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `emoji` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `MessageReaction_messageId_userId_emoji_key` (`messageId`,`userId`,`emoji`),
  KEY `MessageReaction_messageId_idx` (`messageId`),
  KEY `MessageReaction_userId_idx` (`userId`),
  CONSTRAINT `MessageReaction_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `chatmessage` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Structure de la table raisedhand
DROP TABLE IF EXISTS `raisedhand`;
CREATE TABLE `raisedhand` (
  `id` varchar(191) NOT NULL,
  `meetingId` varchar(191) NOT NULL,
  `userId` varchar(191) DEFAULT NULL,
  `username` varchar(191) NOT NULL,
  `raisedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `loweredAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `RaisedHand_meetingId_idx` (`meetingId`),
  KEY `RaisedHand_userId_idx` (`userId`),
  CONSTRAINT `RaisedHand_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `instantmeeting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Structure de la table recording
DROP TABLE IF EXISTS `recording`;
CREATE TABLE `recording` (
  `id` varchar(191) NOT NULL,
  `meetingId` varchar(191) NOT NULL,
  `ownerId` varchar(191) NOT NULL,
  `filePath` varchar(191) NOT NULL,
  `fileSize` int(11) NOT NULL,
  `startedAt` datetime(3) NOT NULL,
  `endedAt` datetime(3) NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'both',
  PRIMARY KEY (`id`),
  KEY `Recording_ownerId_idx` (`ownerId`),
  KEY `Recording_meetingId_idx` (`meetingId`),
  CONSTRAINT `Recording_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `meeting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Recording_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Structure de la table refreshtoken
DROP TABLE IF EXISTS `refreshtoken`;
CREATE TABLE `refreshtoken` (
  `id` varchar(191) NOT NULL DEFAULT uuid(),
  `token` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `RefreshToken_userId_idx` (`userId`),
  CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données de la table refreshtoken
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('0562e0c3-9792-4ff8-918b-9725f1dc567f', 'rt_1758754351937_iboznn2rc2n', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:52:31 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a94fd22-9998-11f0-a06e-005056c00001', 'rt_1758745713230_vh97tvjivc', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:28:33 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a94fea7-9998-11f0-a06e-005056c00001', 'rt_1758745747109_x8qezw1z5aa', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:29:07 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a94ff8e-9998-11f0-a06e-005056c00001', 'rt_1758745894954_rftf352lfxk', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:31:34 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a95003e-9998-11f0-a06e-005056c00001', 'rt_1758746372940_6n9f2bx9vvw', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:39:32 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a9500e1-9998-11f0-a06e-005056c00001', 'rt_1758748552886_xn1oaf6s7lj', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 21:15:52 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a9501a4-9998-11f0-a06e-005056c00001', 'rt_1758750259368_bbvypqfp0b8', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 21:44:19 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a950292-9998-11f0-a06e-005056c00001', 'rt_1758751298194_3d3d2a6az66', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:01:38 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('1a95031e-9998-11f0-a06e-005056c00001', 'rt_1758753348602_bxc9mzq8fuq', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:35:48 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('4a6180b0-ce74-4914-9da6-6aa1b3511058', 'rt_1758754657226_t0p58c2ga4', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:57:37 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('4f279fd6-1cdb-46db-a360-82d90fb20abd', 'rt_1758754412542_mgysi2wtip', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:53:32 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('652f9de9-2678-469d-abb0-c249600e3728', 'rt_1758753916137_b5yh5c3cngk', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:45:16 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('8174fd60-638c-4ae3-a642-b2f6484669cc', 'rt_1758753906594_3i9mhqvfhfz', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:45:06 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('a8e0fd1f-9b78-4f3c-9630-3dcbb6a032e2', 'rt_1758754301166_dhvosrj6hu7', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:51:41 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('e1bffbd5-5a0f-44bd-ae8f-8616e3cd1004', 'rt_1758754345398_1uokiifsycu', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:52:25 GMT+0000 (heure moyenne de Greenwich));
INSERT INTO `refreshtoken` (`id`, `token`, `userId`, `createdAt`) VALUES ('e3f05f08-a11a-4a5b-bbd2-8e3663446c37', 'rt_1758753900523_oivgs4smtqo', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:45:00 GMT+0000 (heure moyenne de Greenwich));


-- Structure de la table session
DROP TABLE IF EXISTS `session`;
CREATE TABLE `session` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `lastActivity` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `ip` varchar(191) DEFAULT NULL,
  `userAgent` varchar(191) DEFAULT NULL,
  `rememberMe` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `Session_userId_idx` (`userId`),
  CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données de la table session
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('00fdd301-a1a5-49ed-96c4-7b5acf691318', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:07:26 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:07:26 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('0af1a7e9-529b-4d98-82d9-26ee391e7e2b', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:03:32 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:03:32 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('0d601e6d-1060-4410-8c24-e847b25a35d3', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 21:15:52 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 21:15:52 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('1a92dc0a-c4ca-4801-a819-a6ed66122edc', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:45:16 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:45:16 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.6584', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('1c22e238-9ce1-472d-bcb7-62d3dd558f3a', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:17:05 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:17:05 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('22ef1dcc-31c3-496b-b6f5-9004bdc4844d', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:45:00 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:45:00 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.6584', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('2d555243-8ebb-4f25-bd6f-093878209719', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 19:36:52 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 19:36:52 GMT+0000 (heure moyenne de Greenwich), '::1', NULL, 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('32c1a7ea-688b-4bf7-aec3-045e0b2bcb1f', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:52:25 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:52:25 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.6584', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('35a3cbd2-d94c-4e84-8752-025c2d4e8810', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:45:06 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:45:06 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.6584', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('3aa2a9e6-e353-4ed9-b56b-044be850eb46', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:28:33 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:28:33 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('3c03b583-6072-413f-8e8b-e20238a3a0b3', '1807e1c9-2861-4383-9a69-be810e7398cc', Wed Sep 24 2025 19:54:18 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 19:54:18 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('3cd3928b-768d-4017-b9b5-d1ab053c258c', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:08:13 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:08:13 GMT+0000 (heure moyenne de Greenwich), '::1', NULL, 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('4f311371-2487-4a87-ba59-b341917178ee', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:44:31 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:44:31 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.6584', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('518bcf82-3dcd-43ae-bc9b-6cf4d8096589', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:16:28 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:16:28 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('5fec8c81-cbd8-4b90-b0a4-9d7595e1d777', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:35:48 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:35:48 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('6e7ece2e-5a0f-4eca-a93b-40ed1f2505ef', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:17:59 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:17:59 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('7a9ce67d-2c9e-4882-9892-9145ebd8668d', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:14:54 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:14:54 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('88bd0fb2-6599-4809-b456-34315803a821', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:39:32 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:39:32 GMT+0000 (heure moyenne de Greenwich), '::1', NULL, 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('8bc99949-8f46-453a-8e90-355c93d3869e', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:51:41 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:51:41 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('918b38df-d0ea-421a-a74e-2b449ae0aa16', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 21:44:19 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 21:44:19 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('9c081de8-f260-4724-b8d7-942d350b396c', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:53:32 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:53:32 GMT+0000 (heure moyenne de Greenwich), '::1', 'node-fetch', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('a5bc00de-7669-4d1e-b5ce-3de4e315e0cc', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:01:38 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:01:38 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('a97893c8-dd01-43c5-8653-6c254d2e6ffd', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:31:34 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:31:34 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('a9e135a3-89a4-44a6-925c-d2a65d76eb99', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:11:16 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:11:16 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('ae6764b3-3251-4872-ba96-c1788dcb8a23', '1807e1c9-2861-4383-9a69-be810e7398cc', Wed Sep 24 2025 19:46:42 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 19:46:42 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('b000fbfb-5964-42f7-bf57-905fc0d09ba1', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:17:22 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:17:22 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('bca13168-5229-448b-aeb5-2d42d70d1c02', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:09:41 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:09:41 GMT+0000 (heure moyenne de Greenwich), '::1', NULL, 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('be235056-8d7d-4939-b494-5284d23855b2', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:10:56 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:10:56 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('c799fc3b-86eb-4f75-bed7-e47c6f897a57', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:52:31 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:52:31 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.6584', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('c9f13f12-89e4-4f58-83a6-b745f59231c6', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:29:07 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:29:07 GMT+0000 (heure moyenne de Greenwich), '::1', NULL, 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('d62e3739-63fc-4b55-bd26-be4185306ed1', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 19:38:38 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 19:38:38 GMT+0000 (heure moyenne de Greenwich), '::1', NULL, 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('d8e22d65-2676-4085-8966-d83458cba57e', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:10:48 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:10:48 GMT+0000 (heure moyenne de Greenwich), '::1', NULL, 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('e04f5524-6777-46c3-8f58-a0b2ea46717c', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:13:27 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:13:27 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('e0bd4915-24b1-4138-9692-21a0b6b25029', '1807e1c9-2861-4383-9a69-be810e7398cc', Wed Sep 24 2025 19:41:29 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 19:41:29 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('ec8a2253-2e5b-4325-94d7-442ed4b402c8', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 22:57:37 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:57:37 GMT+0000 (heure moyenne de Greenwich), '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; fr-FR) WindowsPowerShell/5.1.26100.6584', 0);
INSERT INTO `session` (`id`, `userId`, `createdAt`, `lastActivity`, `ip`, `userAgent`, `rememberMe`) VALUES ('f4451c27-a657-4b03-b46c-a347fcbf9f88', '02e8263e-b7bf-4089-adf7-05b5eaee6d65', Wed Sep 24 2025 20:12:54 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 20:12:54 GMT+0000 (heure moyenne de Greenwich), '127.0.0.1', 'Test Script', 0);


-- Structure de la table user
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL DEFAULT 'user',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `lastLogin` datetime(3) DEFAULT NULL,
  `firstName` varchar(191) DEFAULT NULL,
  `lastName` varchar(191) DEFAULT NULL,
  `avatar` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données de la table user
INSERT INTO `user` (`id`, `username`, `email`, `password`, `role`, `isActive`, `createdAt`, `lastLogin`, `firstName`, `lastName`, `avatar`) VALUES ('02e8263e-b7bf-4089-adf7-05b5eaee6d65', 'admin', 'admin@webrtc-visioconf.com', '$2b$10$IWO0gDvEC5/iZv3RpCoN.eq4VXoVkRZYYr0QgWehSs3TsDSlYFDK2', 'admin', 1, Wed Sep 24 2025 19:36:37 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 22:57:37 GMT+0000 (heure moyenne de Greenwich), 'Admin', 'User', NULL);
INSERT INTO `user` (`id`, `username`, `email`, `password`, `role`, `isActive`, `createdAt`, `lastLogin`, `firstName`, `lastName`, `avatar`) VALUES ('1807e1c9-2861-4383-9a69-be810e7398cc', 'testuser', 'test@webrtc-visioconf.com', '$2b$10$JT.CWTvu.Zl0jzA5/UW5V.53jdd.Q/Q7y78cYjMf3Eig/x8kO7fSu', 'user', 1, Wed Sep 24 2025 19:36:37 GMT+0000 (heure moyenne de Greenwich), Wed Sep 24 2025 19:54:18 GMT+0000 (heure moyenne de Greenwich), 'Test', 'User', NULL);
INSERT INTO `user` (`id`, `username`, `email`, `password`, `role`, `isActive`, `createdAt`, `lastLogin`, `firstName`, `lastName`, `avatar`) VALUES ('f23da797-9900-4799-9da6-0d14b2a94593', 'demo', 'demo@webrtc-visioconf.com', '$2b$10$R2730tjqONNcbIF.wGhus.PKR2ucvU740Z4Xosb4MzO6uakLUJpYi', 'user', 1, Wed Sep 24 2025 19:36:37 GMT+0000 (heure moyenne de Greenwich), NULL, 'Demo', 'User', NULL);

