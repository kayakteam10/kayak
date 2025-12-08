-- Drop problematic triggers that cause conflicts
DROP TRIGGER IF EXISTS before_payment_method_insert;
DROP TRIGGER IF EXISTS before_payment_method_update;

-- The default flag logic will be handled in application code instead
