<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\TransactionAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TransactionAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_attachments_to_own_transaction()
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $transaction = Transaction::factory()->create(['user_id' => $user->id]);

        $file = UploadedFile::fake()->create('receipt.jpg', 100);

        $response = $this->actingAs($user)
            ->postJson("/api/transactions/{$transaction->id}/attachments", [
                'files' => [$file]
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transaction_attachments', [
            'transaction_id' => $transaction->id,
            'user_id' => $user->id,
            'original_name' => 'receipt.jpg',
        ]);

        $attachment = TransactionAttachment::first();
        Storage::disk('local')->assertExists($attachment->path);
    }

    public function test_audit_log_created_on_upload()
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $transaction = Transaction::factory()->create(['user_id' => $user->id]);
        $file = UploadedFile::fake()->create('receipt.jpg', 100);

        $this->actingAs($user)
            ->postJson("/api/transactions/{$transaction->id}/attachments", [
                'files' => [$file]
            ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'attachment_uploaded',
            'model' => 'TransactionAttachment',
            'user_id' => $user->id,
        ]);
    }

    public function test_user_cannot_upload_to_others_transaction()
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $transaction = Transaction::factory()->create(['user_id' => $otherUser->id]);

        $file = UploadedFile::fake()->create('receipt.jpg', 100);

        $response = $this->actingAs($user)
            ->postJson("/api/transactions/{$transaction->id}/attachments", [
                'files' => [$file]
            ]);

        $response->assertStatus(403);
    }

    public function test_user_can_list_attachments()
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $transaction = Transaction::factory()->create(['user_id' => $user->id]);

        $attachment = TransactionAttachment::create([
            'transaction_id' => $transaction->id,
            'user_id' => $user->id,
            'disk' => 'local',
            'path' => 'test/file.jpg',
            'original_name' => 'file.jpg',
            'filename' => 'file.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 100,
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/transactions/{$transaction->id}/attachments");

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['original_name' => 'file.jpg']);
    }

    public function test_user_can_download_attachment()
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $transaction = Transaction::factory()->create(['user_id' => $user->id]);

        $file = UploadedFile::fake()->create('receipt.jpg', 100);
        $path = $file->store('transaction_attachments', 'local');

        $attachment = TransactionAttachment::create([
            'transaction_id' => $transaction->id,
            'user_id' => $user->id,
            'disk' => 'local',
            'path' => $path,
            'original_name' => 'receipt.jpg',
            'filename' => basename($path),
            'mime_type' => 'image/jpeg',
            'size' => 100,
        ]);

        $response = $this->actingAs($user)
            ->get("/api/attachments/{$attachment->id}/download");

        $response->assertStatus(200);
        $response->assertHeader('content-disposition', 'attachment; filename=receipt.jpg');
    }

    public function test_user_can_delete_attachment()
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $transaction = Transaction::factory()->create(['user_id' => $user->id]);

        $attachment = TransactionAttachment::create([
            'transaction_id' => $transaction->id,
            'user_id' => $user->id,
            'disk' => 'local',
            'path' => 'dummy',
            'original_name' => 'file.jpg',
            'filename' => 'dummy',
            'mime_type' => 'image/jpeg',
            'size' => 100,
        ]);

        $response = $this->actingAs($user)
            ->deleteJson("/api/attachments/{$attachment->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted($attachment);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'attachment_deleted',
            'model' => 'TransactionAttachment',
            'model_id' => $attachment->id,
        ]);
    }
}
