"use client";

import { ArrowLeftOutlined, ArrowRightOutlined, DeleteOutlined, InboxOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Image, Popconfirm, Tag, Tooltip, Typography, Upload } from "antd";
import { useState } from "react";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { PhotoOwner } from "@/lib/api/tenant-api";
import type { Photo } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { compressImage } from "@/lib/compressImage";

interface PhotoGalleryProps {
  owner: PhotoOwner;
  ownerId: string;
  photos: Photo[];
  max: number;
  canEdit: boolean;
  onChanged: () => void;
}

const ACCEPT = "image/png,image/jpeg,image/webp";

/** Photos of a property or unit: preview, drag-and-drop upload (compressed first), reorder, cover, delete. */
export function PhotoGallery({ owner, ownerId, photos, max, canEdit, onChanged }: PhotoGalleryProps) {
  const { api } = useTenant();
  const { message } = App.useApp();
  const [optimizing, setOptimizing] = useState(0);

  const upload = useMutation({
    mutationFn: async (file: File) => api.addPhoto(owner, ownerId, await compressImage(file)),
    onSuccess: onChanged,
    onError: (error) => message.error(isApiError(error) ? errorMessage(error) : error.message),
    onSettled: () => setOptimizing((n) => Math.max(0, n - 1)),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.reorderPhotos(owner, ownerId, ids),
    onSuccess: onChanged,
    onError: (error) => message.error(errorMessage(error)),
  });
  const cover = useMutation({
    mutationFn: (photoId: string) => api.setCoverPhoto(owner, ownerId, photoId),
    onSuccess: onChanged,
    onError: (error) => message.error(errorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (photoId: string) => api.deletePhoto(photoId),
    onSuccess: onChanged,
    onError: (error) => message.error(errorMessage(error)),
  });

  const move = (index: number, delta: number) => {
    const ids = photos.map((p) => p.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids);
  };
  const full = photos.length >= max;

  return (
    <div>
      {photos.length === 0 && !canEdit && <Empty description="No photos yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      <Image.PreviewGroup>
        <Flex wrap gap={12}>
          {photos.map((photo, index) => (
            <div key={photo.id} style={{ width: 160 }}>
              <div style={{ position: "relative" }}>
                <Image src={photo.url} alt={photo.caption ?? "Photo"} width={160} height={120}
                  style={{ objectFit: "cover", borderRadius: 8 }} />
                {photo.cover && <Tag color="gold" style={{ position: "absolute", top: 6, left: 6 }}>Cover</Tag>}
              </div>
              {canEdit && (
                <Flex justify="space-between" style={{ marginTop: 4 }}>
                  <Flex>
                    <Tooltip title="Move left">
                      <Button type="text" size="small" icon={<ArrowLeftOutlined />} disabled={index === 0}
                        onClick={() => move(index, -1)} />
                    </Tooltip>
                    <Tooltip title="Move right">
                      <Button type="text" size="small" icon={<ArrowRightOutlined />}
                        disabled={index === photos.length - 1} onClick={() => move(index, 1)} />
                    </Tooltip>
                  </Flex>
                  <Flex>
                    <Tooltip title={photo.cover ? "Cover photo" : "Use as cover"}>
                      <Button type="text" size="small" disabled={photo.cover}
                        icon={photo.cover ? <StarFilled style={{ color: "#eab308" }} /> : <StarOutlined />}
                        onClick={() => cover.mutate(photo.id)} />
                    </Tooltip>
                    <Popconfirm title="Delete this photo?" okText="Delete" okButtonProps={{ danger: true }}
                      onConfirm={() => remove.mutate(photo.id)}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Delete photo" />
                    </Popconfirm>
                  </Flex>
                </Flex>
              )}
            </div>
          ))}
        </Flex>
      </Image.PreviewGroup>
      {canEdit && (
        <Upload.Dragger accept={ACCEPT} multiple showUploadList={false} disabled={full}
          style={{ marginTop: photos.length ? 16 : 0 }}
          beforeUpload={(file) => {
            setOptimizing((n) => n + 1);
            upload.mutate(file);
            return false;
          }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">
            {optimizing > 0 ? "Optimizing and uploading…" : full ? `Photo limit reached (${max})`
              : "Drop photos here or click to choose"}
          </p>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            PNG, JPEG or WebP. Photos are resized and compressed before upload. {photos.length}/{max} used.
          </Typography.Text>
        </Upload.Dragger>
      )}
    </div>
  );
}
