<?php

namespace App\Policies;

use Illuminate\Auth\Access\Response;
use App\Models\TransactionAttachment;
use App\Models\User;

class TransactionAttachmentPolicy
{
    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, TransactionAttachment $attachment): bool
    {
        return $user->id === $attachment->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, TransactionAttachment $attachment): bool
    {
        return $user->id === $attachment->user_id;
    }
}
