package handler

import (
	"net/http"
	"time"

	"github.com/fernandobarroso/profile-service/internal/api/middleware/logger"
	"github.com/fernandobarroso/profile-service/internal/api/service"
	"github.com/fernandobarroso/profile-service/internal/models"
	"github.com/fernandobarroso/profile-service/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ProfileHandler handles HTTP requests for profile operations
type ProfileHandler struct {
	service *service.ProfileService
}

// NewProfileHandler creates a new profile handler
func NewProfileHandler(service *service.ProfileService) *ProfileHandler {
	return &ProfileHandler{
		service: service,
	}
}

// Create handles profile creation
func (h *ProfileHandler) Create(c *gin.Context) {
	var req models.CreateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, http.StatusBadRequest, "Invalid request", err)
		return
	}

	profile := &models.Profile{
		Name:      req.Name,
		Email:     req.Email,
		Bio:       req.Bio,
		ImageURLs: []string{},
	}

	if err := h.service.Create(c.Request.Context(), profile); err != nil {
		h.handleError(c, http.StatusInternalServerError, "Failed to create profile", err)
		return
	}

	c.JSON(http.StatusCreated, profile)
}

// GetProfile handles GET /profiles/{id} requests
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID is required"})
		return
	}

	profile, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get profile"})
		return
	}

	if profile == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// Update handles profile updates
func (h *ProfileHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		h.handleError(c, http.StatusBadRequest, "Missing profile ID", nil)
		return
	}

	var profile models.Profile
	if err := c.ShouldBindJSON(&profile); err != nil {
		h.handleError(c, http.StatusBadRequest, "Invalid request", err)
		return
	}

	profile.ID = id
	if err := h.service.Update(c.Request.Context(), id, &profile); err != nil {
		h.handleError(c, http.StatusInternalServerError, "Failed to update profile", err)
		return
	}

	c.JSON(http.StatusOK, profile)
}

// Delete handles profile deletion
func (h *ProfileHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		h.handleError(c, http.StatusBadRequest, "Missing profile ID", nil)
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		h.handleError(c, http.StatusInternalServerError, "Failed to delete profile", err)
		return
	}

	c.Status(http.StatusNoContent)
}

// List handles retrieving all profiles
func (h *ProfileHandler) List(c *gin.Context) {
	profiles, err := h.service.List(c.Request.Context())
	if err != nil {
		h.handleError(c, http.StatusInternalServerError, "Failed to list profiles", err)
		return
	}

	c.JSON(http.StatusOK, profiles)
}

// GenerateRandom handles generating random profiles
func (h *ProfileHandler) GenerateRandom(c *gin.Context) {
	profile := utils.GenerateRandomProfile()
	if err := h.service.Create(c.Request.Context(), profile); err != nil {
		h.handleError(c, http.StatusInternalServerError, "Failed to create random profile", err)
		return
	}

	c.JSON(http.StatusCreated, profile)
}

// ProcessDelayedTask handles processing of delayed tasks
func (h *ProfileHandler) ProcessDelayedTask(c *gin.Context) {
	taskID := uuid.New().String()
	task := &models.DelayedTask{
		ID:        taskID,
		CreatedAt: time.Now(),
	}

	if err := h.service.ProcessDelayedTask(c.Request.Context(), task); err != nil {
		h.handleError(c, http.StatusInternalServerError, "Failed to process delayed task", err)
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"taskID": taskID})
}

// handleError handles error responses
func (h *ProfileHandler) handleError(c *gin.Context, status int, message string, err error) {
	if err != nil {
		logger.Log.Error(message,
			zap.Error(err),
		)
	}
	c.JSON(status, gin.H{"error": message})
}
