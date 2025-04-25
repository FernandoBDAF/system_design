package models

import (
	"time"
)

type Profile struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	Name      string    `json:"name" bson:"name"`
	Email     string    `json:"email" bson:"email"`
	Bio       string    `json:"bio" bson:"bio"`
	ImageURLs []string  `json:"image_urls" bson:"image_urls"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

type CreateProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Bio   string `json:"bio"`
}

type UpdateProfileRequest struct {
	Name  string `json:"name"`
	Email string `json:"email" binding:"omitempty,email"`
	Bio   string `json:"bio"`
}
