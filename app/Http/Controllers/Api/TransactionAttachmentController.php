<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\TransactionAttachment;
use App\Services\BusinessAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TransactionAttachmentController extends Controller
{
    protected $auditService;

    public function __construct(BusinessAuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    public function index(Transaction $transaction)
    {
        if ($transaction->user_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        return $transaction->attachments()->get();
    }

    public function store(Request $request, Transaction $transaction)
    {
        if ($transaction->user_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'files' => 'required|array',
            'files.*' => 'required|file|max:10240|mimes:jpeg,png,jpg,pdf,webp', // 10MB
        ]);

        $savedAttachments = [];

        foreach ($request->file('files') as $file) {
            $path = $file->store('transaction_attachments', 'local');

            $attachment = $transaction->attachments()->create([
                'user_id' => $transaction->user_id,
                'disk' => 'local',
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'filename' => basename($path),
                'mime_type' => $file->getClientMimeType(),
                'size' => $file->getSize(),
            ]);

            $this->auditService->log(
                'attachment_uploaded',
                $attachment,
                [
                    'before' => [],
                    'after' => $attachment->toArray()
                ]
            );

            $savedAttachments[] = $attachment;
        }

        return response()->json([
            'message' => 'Attachments uploaded successfully',
            'attachments' => $savedAttachments
        ], 201);
    }

    public function download(TransactionAttachment $attachment)
    {
        if ($attachment->user_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        if (!Storage::disk($attachment->disk)->exists($attachment->path)) {
            abort(404);
        }

        return Storage::disk($attachment->disk)->download(
            $attachment->path,
            $attachment->original_name
        );
    }

    public function destroy(TransactionAttachment $attachment)
    {
        if ($attachment->user_id !== auth()->id()) {
            abort(403, 'Unauthorized');
        }

        $originalData = $attachment->toArray();

        $attachment->delete(); // Soft delete

        $this->auditService->log(
            'attachment_deleted',
            $attachment,
            [
                'before' => $originalData,
                'after' => []
            ]
        );

        return response()->json(['message' => 'Attachment deleted successfully']);
    }
}
