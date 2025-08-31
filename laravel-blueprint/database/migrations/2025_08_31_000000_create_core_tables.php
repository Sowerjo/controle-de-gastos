<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('password');
            $t->rememberToken();
            $t->timestamps();
        });

        Schema::create('accounts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->enum('type', ['cash','checking','savings','credit_card','wallet','investment']);
            $t->char('currency',3)->default('BRL');
            $t->decimal('opening_balance', 12, 2)->default(0);
            $t->integer('display_order')->default(0);
            $t->timestamp('archived_at')->nullable();
            $t->timestamps();
            $t->unique(['user_id','name']);
        });

        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $t->enum('type', ['income','expense']);
            $t->string('name');
            $t->timestamps();
            $t->unique(['user_id','parent_id','type','name']);
            $t->index(['user_id','parent_id','type','name']);
        });

        Schema::create('tags', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->timestamps();
            $t->unique(['user_id','name']);
        });

        Schema::create('payees', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->timestamps();
            $t->unique(['user_id','name']);
        });

        Schema::create('transactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $t->enum('type', ['income','expense','transfer']);
            $t->decimal('amount', 12, 2);
            $t->date('date');
            $t->string('description', 255)->nullable();
            $t->foreignId('payee_id')->nullable()->constrained('payees')->nullOnDelete();
            $t->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $t->enum('status',['pending','cleared','reconciled'])->default('cleared');
            $t->text('notes')->nullable();
            $t->string('import_batch_id')->nullable();
            $t->uuid('transfer_group_id')->nullable();
            $t->timestamps();
            $t->index(['user_id','account_id','date']);
            $t->index(['user_id','status']);
            $t->index(['user_id','type']);
        });

        Schema::create('transaction_splits', function (Blueprint $t) {
            $t->id();
            $t->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $t->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $t->decimal('amount', 12, 2);
            $t->timestamps();
        });

        Schema::create('transaction_tag', function (Blueprint $t) {
            $t->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $t->foreignId('tag_id')->constrained('tags')->cascadeOnDelete();
            $t->primary(['transaction_id','tag_id']);
        });

        Schema::create('attachments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $t->string('path');
            $t->string('mime');
            $t->unsignedBigInteger('size');
            $t->string('checksum', 64);
            $t->timestamp('uploaded_at');
            $t->timestamps();
        });

        Schema::create('recurring_transactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->json('template');
            $t->enum('freq',['monthly','weekly','yearly']);
            $t->unsignedInteger('interval')->default(1);
            $t->unsignedTinyInteger('day_of_month')->nullable();
            $t->string('by_day')->nullable();
            $t->timestamp('ends_at')->nullable();
            $t->timestamp('next_run_at');
            $t->timestamps();
        });

        Schema::create('budget_periods', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('period', 7); // YYYY-MM
            $t->timestamps();
            $t->unique(['user_id','period']);
        });

        Schema::create('budget_allocations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('budget_period_id')->constrained('budget_periods')->cascadeOnDelete();
            $t->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $t->decimal('amount', 12, 2);
            $t->boolean('rollover')->default(false);
            $t->timestamps();
            $t->unique(['budget_period_id','category_id']);
        });

        Schema::create('goals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->decimal('target_amount', 12, 2);
            $t->date('target_date');
            $t->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $t->enum('strategy',['linear','by_allocation'])->default('linear');
            $t->timestamps();
        });

        Schema::create('import_batches', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->json('mapping');
            $t->string('dedupe_strategy')->default('account_amount_date');
            $t->string('status')->default('pending');
            $t->json('totals')->nullable();
            $t->timestamp('created_at');
        });

        Schema::create('import_rows', function (Blueprint $t) {
            $t->id();
            $t->foreignId('import_batch_id')->constrained('import_batches')->cascadeOnDelete();
            $t->json('data');
            $t->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $t->boolean('is_duplicate')->default(false);
            $t->timestamps();
        });

        Schema::create('reconciliations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $t->decimal('statement_opening_balance',12,2);
            $t->decimal('statement_closing_balance',12,2);
            $t->date('from');
            $t->date('to');
            $t->timestamp('closed_at')->nullable();
            $t->timestamps();
        });

        Schema::create('reconciliation_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('reconciliation_id')->constrained('reconciliations')->cascadeOnDelete();
            $t->foreignId('transaction_id')->constrained('transactions')->cascadeOnDelete();
            $t->timestamp('reconciled_at');
            $t->timestamps();
        });

        // Laravel queues/sessions (database)
        Schema::create('jobs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('queue');
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
            $table->index(['queue','reserved_at']);
        });
        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('reconciliation_items');
        Schema::dropIfExists('reconciliations');
        Schema::dropIfExists('import_rows');
        Schema::dropIfExists('import_batches');
        Schema::dropIfExists('goals');
        Schema::dropIfExists('budget_allocations');
        Schema::dropIfExists('budget_periods');
        Schema::dropIfExists('recurring_transactions');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('transaction_tag');
        Schema::dropIfExists('transaction_splits');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('payees');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('users');
    }
};
