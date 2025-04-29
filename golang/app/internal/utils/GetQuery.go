package utils

import (
	"github.com/gin-gonic/gin"
)

func GetQuery(c *gin.Context, names []string, defaultValue string) string {
	for _, name := range names {
		value := c.Query(name)

		if value != "" {
			return value
		}
	}

	return defaultValue
}
