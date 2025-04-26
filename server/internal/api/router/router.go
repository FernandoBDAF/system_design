package router

import (
	"github.com/fernandobarroso/profile-service/internal/api/handler"
	"github.com/gin-gonic/gin"
)

// SetupRouter configures and returns a new Gin router
func SetupRouter(profileHandler *handler.ProfileHandler) *gin.Engine {
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.String(200, "healthy")
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		profiles := v1.Group("/profiles")
		{
			profiles.POST("", profileHandler.Create)
			profiles.GET("", profileHandler.List)
			profiles.GET("/:id", profileHandler.GetProfile)
			profiles.PUT("/:id", profileHandler.Update)
			profiles.DELETE("/:id", profileHandler.Delete)
			profiles.POST("/random", profileHandler.GenerateRandom)
		}

		tasks := v1.Group("/tasks")
		{
			tasks.POST("/delayed", profileHandler.ProcessDelayedTask)
		}
	}

	return router
}
