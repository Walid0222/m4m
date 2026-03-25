<?php

namespace App\Http\Controllers\Api;

use App\Models\Dispute;
use App\Models\DisputeActivity;
use App\Models\DisputeEvidence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DisputeEvidenceController extends Controller
{
    /**
     * Get all evidences attached to a dispute.
     */
    public function index(Request $request, Dispute $dispute): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessDispute($user, $dispute)) {
            return $this->error('Forbidden.', 403);
        }

        $query = $dispute->evidences()->orderByDesc('created_at');

        if (! $user->is_admin) {
            $query->where('is_internal', false);
        }

        $evidences = $query->with(['user:id,name'])->get();

        return $this->success($evidences);
    }

    /**
     * Upload a new evidence item.
     */
    public function store(Request $request, Dispute $dispute): JsonResponse
    {
        $user = $request->user();

        if (! $this->canAccessDispute($user, $dispute)) {
            return $this->error('Forbidden.', 403);
        }

        // Do not allow new evidence on resolved / refunded disputes
        if (in_array($dispute->status, ['resolved', 'refunded'], true)) {
            return $this->error('Dispute is already resolved.', 422);
        }

        $role = $this->determineRole($user, $dispute);
        if ($role === null) {
            return $this->error('Forbidden.', 403);
        }

        $rules = [
            'type'        => ['required', 'in:image,file,link,note'],
            'title'       => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_internal' => ['sometimes', 'boolean'],
        ];

        $type = $request->input('type');

        if (in_array($type, ['image', 'file'], true)) {
            // 10MB max, restrict to safe file extensions
            $rules['file'] = [
                'required',
                'file',
                'max:10240', // 10MB
                'mimes:jpg,jpeg,png,gif,webp,pdf,txt,doc,docx,xls,xlsx',
            ];
        } elseif ($type === 'link') {
            $rules['path'] = ['required', 'url', 'max:2048'];
        } elseif ($type === 'note') {
            $rules['description'] = ['required', 'string', 'max:5000'];
        }

        $validated = $request->validate($rules);

        $isInternal = false;
        if ($user->is_admin) {
            $isInternal = (bool) ($validated['is_internal'] ?? false);
        }

        $storageDisk = 'local';
        $path = null;
        $originalName = null;
        $mimeType = null;
        $sizeBytes = null;

        if (in_array($type, ['image', 'file'], true)) {
            $file = $request->file('file');
            if (! $file || ! $file->isValid()) {
                return $this->error('Invalid file upload.', 422);
            }
            $ext = $file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin';
            $filename = Str::uuid()->toString() . '.' . $ext;
            $directory = sprintf('disputes/%s/%s', $dispute->id, $user->id);
            $file->storeAs($directory, $filename, 'local');
            $path = $directory . '/' . $filename;

            $originalName = $file->getClientOriginalName();
            $mimeType = $file->getMimeType();
            $sizeBytes = $file->getSize();
        } elseif ($type === 'link') {
            $storageDisk = 'url';
            $path = $validated['path'];
        }

        $evidence = DisputeEvidence::create([
            'dispute_id'    => $dispute->id,
            'user_id'       => $user->id,
            'role'          => $role,
            'type'          => $type,
            'storage_disk'  => $storageDisk,
            'path'          => $path,
            'original_name' => $originalName,
            'mime_type'     => $mimeType,
            'size_bytes'    => $sizeBytes,
            'title'         => $validated['title'] ?? null,
            'description'   => $validated['description'] ?? null,
            'is_internal'   => $isInternal,
        ]);

        $evidence->load('user:id,name');

        DisputeActivity::create([
            'dispute_id' => $dispute->id,
            'user_id'    => $user->id,
            'type'       => 'evidence_uploaded',
            'data'       => [
                'evidence_id' => $evidence->id,
            ],
        ]);

        return $this->success($evidence, 'Evidence uploaded.', 201);
    }

    /**
     * Serve the stored evidence file.
     */
    public function showFile(Request $request, Dispute $dispute, DisputeEvidence $evidence): JsonResponse|\Symfony\Component\HttpFoundation\Response
    {
        if ($evidence->dispute_id !== $dispute->id) {
            return $this->error('Not found.', 404);
        }

        $user = $request->user();

        if (! $this->canAccessDispute($user, $dispute)) {
            return $this->error('Forbidden.', 403);
        }

        if ($evidence->is_internal && ! $user->is_admin) {
            return $this->error('Forbidden.', 403);
        }

        if ($evidence->storage_disk === 'url') {
            // Prevent server-driven redirects for externally hosted evidence.
            // Clients can handle the URL presentation/opening safely.
            return response()->json(['url' => $evidence->path], 200);
        }

        if (! Storage::disk($evidence->storage_disk)->exists($evidence->path)) {
            return $this->error('File not found.', 404);
        }

        return Storage::disk($evidence->storage_disk)->response($evidence->path);
    }

    /**
     * Check if the authenticated user can access the dispute.
     */
    protected function canAccessDispute($user, Dispute $dispute): bool
    {
        if ($user->is_admin) {
            return true;
        }

        return $dispute->buyer_id === $user->id
            || $dispute->seller_id === $user->id;
    }

    /**
     * Determine the role of the user in this dispute.
     */
    protected function determineRole($user, Dispute $dispute): ?string
    {
        if ($user->is_admin) {
            return 'admin';
        }

        if ($dispute->buyer_id === $user->id) {
            return 'buyer';
        }

        if ($dispute->seller_id === $user->id) {
            return 'seller';
        }

        return null;
    }
}
