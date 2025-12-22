<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditObserver
{
    public function created(Model $model)
    {
        $this->logAction('create', $model);
    }

    public function updated(Model $model)
    {
        $changes = $model->getChanges();

        // Skip logging if only timestamps or archived_at changed
        // (archive/unarchive actions are logged separately by services/controllers)
        $ignoredFields = ['updated_at', 'created_at', 'archived_at'];
        $significantChanges = array_diff_key($changes, array_flip($ignoredFields));

        if (empty($significantChanges)) {
            return;
        }

        $original = $model->getOriginal();

        $this->logAction('update', $model, [
            'changes' => $significantChanges,
            'original' => array_intersect_key($original, $significantChanges)
        ]);
    }

    public function deleted(Model $model)
    {
        $this->logAction('delete', $model);
    }

    // Custom events like 'paid', 'refunded' are handled manually in Service/Controller.
    // This Observer handles standard CRUD.

    protected function logAction(string $action, Model $model, array $details = [])
    {
        // Only log if user is authenticated (system actions might be filtered or user_id 0)
        // Requirement: "Autoria" (Audit).

        $userId = Auth::id() ?? $model->user_id ?? null; // Fallback to model owner

        if (!$userId)
            return;

        AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'model' => class_basename($model),
            'model_id' => $model->id,
            'details' => json_encode($details),
            'ip_address' => request()->ip(),
        ]);
    }
}
