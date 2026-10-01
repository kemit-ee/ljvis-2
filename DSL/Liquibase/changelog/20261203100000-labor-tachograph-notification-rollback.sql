-- rollback for 20261203100000-labor-tachograph-notification.sql

DELETE FROM notifications.notification_template_mapping
WHERE notification_type = 'labor_tachograph_not_downloaded';
