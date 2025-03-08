-- Primeiro, excluir todas as entradas existentes
DELETE FROM api_order;

-- Em seguida, inserir apenas as três APIs que estamos testando
INSERT INTO api_order (id, name, enabled, "order", max_requests, current_requests)
VALUES
  (1, 'rocketapi_get_info', true, 1, 100, 0),
  (2, 'instagram_scraper', true, 2, 50, 0),
  (3, 'realtime_instagram_scraper', true, 3, 50, 0);

-- Resetar a sequência para evitar conflitos de ID
ALTER SEQUENCE api_order_id_seq RESTART WITH 4;
