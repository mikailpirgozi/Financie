-- Check if user has household
SELECT 'Households:' as info;
SELECT h.id, h.name, hm.user_id, hm.role 
FROM households h
JOIN household_members hm ON h.id = hm.household_id
LIMIT 5;

-- Check incomes
SELECT 'Incomes:' as info;
SELECT COUNT(*) as count, household_id FROM incomes GROUP BY household_id;

-- Check expenses  
SELECT 'Expenses:' as info;
SELECT COUNT(*) as count, household_id FROM expenses GROUP BY household_id;

-- Check loans
SELECT 'Loans:' as info;
SELECT COUNT(*) as count, household_id FROM loans GROUP BY household_id;

-- Check assets
SELECT 'Assets:' as info;
SELECT COUNT(*) as count, household_id FROM assets GROUP BY household_id;
