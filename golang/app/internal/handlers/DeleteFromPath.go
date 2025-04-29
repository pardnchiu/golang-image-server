package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pardnchiu/golang-image-caching-server/internal/configs"
	"github.com/pardnchiu/golang-image-caching-server/internal/utils"
)

func DeleteFromPath(c *gin.Context) {
	isDir := false

	log.Printf("DELETE: remove file from path")

	// * remove "/" from leading and trailing
	path := strings.Trim(c.Param("path"), "/")
	if path == "" {
		log.Printf("└── [INFO] please assign a path first")
		c.String(http.StatusBadRequest, "please assign a path first")
		return
	}
	log.Printf("├── [INFO] path: %s", path)

	storagePath := filepath.Join(configs.GetUploadPath(), path)
	trashPath := filepath.Join(configs.GetTrashPath(), time.Now().Format("2006-01-02"))

	// * set timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	type Result struct {
		// * target path
		path       string
		err        error
		errMessage string
	}
	resultCh := make(chan Result)

	go func() {
		var result Result

		// * check file exist
		pathInfo, err := os.Stat(storagePath)
		if err != nil {
			result.err = err
			result.errMessage = "path not found: " + path
			resultCh <- result
			return
		}
		isDir = pathInfo.IsDir()

		// * check .trash/XXXX-XX-XX exist, if not, create
		if err := os.MkdirAll(trashPath, 0755); err != nil {
			result.err = err
			result.errMessage = "can not create folder: " + trashPath
			resultCh <- result
			return
		}

		filename := filepath.Base(storagePath)
		result.path = filepath.Join(trashPath, filename)

		// * check file exist in .trash
		if _, err := os.Stat(result.path); err == nil {
			ext := filepath.Ext(filename)
			base := strings.TrimSuffix(filename, ext)
			// * if exist, rename file with timestamp
			result.path = filepath.Join(trashPath, fmt.Sprintf("%s_%d%s", base, time.Now().UnixNano()/int64(time.Millisecond), ext))
		}

		// * move file to .trash
		if err := os.Rename(storagePath, result.path); err != nil {
			result.err = err
			result.errMessage = "can not move file: " + storagePath
			resultCh <- result
			return
		}

		resultCh <- result
	}()

	select {
	case result := <-resultCh:
		if result.err != nil {
			utils.HandleError(c, http.StatusBadRequest, result.errMessage, result.err)
			return
		}

		if isDir {
			c.JSON(http.StatusOK, gin.H{
				"success": 1,
				"message": "move folder to: " + result.path,
			})
			log.Printf("└── [INFO] move folder to: " + result.path)
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": 1,
				"message": "move path to: " + result.path,
			})
			log.Printf("└── [INFO] move file to: " + result.path)
		}

	case <-ctx.Done():
		log.Printf("└── [ERROR] timed out")
		c.String(http.StatusRequestTimeout, "timed out")
	}
}
