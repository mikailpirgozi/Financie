-- Add portfolio columns if they don't exist
DO $$
BEGIN
    -- Add linked_asset_id to loans if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'linked_asset_id'
    ) THEN
        ALTER TABLE public.loans ADD COLUMN linked_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;
        CREATE INDEX idx_loans_linked_asset ON public.loans(linked_asset_id) WHERE linked_asset_id IS NOT NULL;
        RAISE NOTICE 'Added linked_asset_id to loans';
    ELSE
        RAISE NOTICE 'linked_asset_id already exists';
    END IF;

    -- Add loan_purpose to loans if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'loan_purpose'
    ) THEN
        ALTER TABLE public.loans ADD COLUMN loan_purpose TEXT CHECK (loan_purpose IN ('property_purchase', 'vehicle_purchase', 'business_loan', 'consumer_loan', 'refinancing', 'other'));
        RAISE NOTICE 'Added loan_purpose to loans';
    ELSE
        RAISE NOTICE 'loan_purpose already exists';
    END IF;

    -- Add is_income_generating to assets if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'is_income_generating'
    ) THEN
        ALTER TABLE public.assets ADD COLUMN is_income_generating BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_income_generating to assets';
    ELSE
        RAISE NOTICE 'is_income_generating already exists';
    END IF;

    -- Add monthly_income to assets if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'monthly_income'
    ) THEN
        ALTER TABLE public.assets ADD COLUMN monthly_income DECIMAL(15, 2) DEFAULT 0 CHECK (monthly_income >= 0);
        RAISE NOTICE 'Added monthly_income to assets';
    ELSE
        RAISE NOTICE 'monthly_income already exists';
    END IF;

    -- Add monthly_expenses to assets if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'monthly_expenses'
    ) THEN
        ALTER TABLE public.assets ADD COLUMN monthly_expenses DECIMAL(15, 2) DEFAULT 0 CHECK (monthly_expenses >= 0);
        RAISE NOTICE 'Added monthly_expenses to assets';
    ELSE
        RAISE NOTICE 'monthly_expenses already exists';
    END IF;

    -- Add asset_status to assets if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'asset_status'
    ) THEN
        ALTER TABLE public.assets ADD COLUMN asset_status TEXT DEFAULT 'owned' CHECK (asset_status IN ('owned', 'rented_out', 'for_sale', 'sold'));
        RAISE NOTICE 'Added asset_status to assets';
    ELSE
        RAISE NOTICE 'asset_status already exists';
    END IF;
END $$;

