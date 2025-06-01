package handlers

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pardnchiu/golang-image-caching-server/internal/configs"
	"github.com/pardnchiu/golang-image-caching-server/internal/utils"
)

func PostToPath(c *gin.Context) {
	log.Printf("POST: upload file to path")

	// * remove "/" from leading and trailing
	path := strings.Trim(c.Param("path"), "/")
	if path == "" {
		log.Printf("└── [INFO] please assign a path first")
		c.String(http.StatusBadRequest, "please assign a path first")
		return
	}
	log.Printf("├── [INFO] path: %s", path)

	// * set timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	type Result struct {
		filename   string
		filetype   string
		filesize   int64
		src        string
		err        error
		errMessage string
	}
	resultCh := make(chan Result)

	go func() {
		var result Result

		// * check folder path
		storagePath := filepath.Join(configs.GetUploadPath(), path)
		if err := os.MkdirAll(storagePath, 0755); err != nil {
			result.err = err
			result.errMessage = "can not create folder: " + storagePath
			resultCh <- result
			return
		}

		// * get file form request
		file, err := c.FormFile("filepath")
		if err != nil {
			result.err = err
			result.errMessage = "can not get file form request"
			resultCh <- result
			return
		}
		result.filesize = file.Size

		// * check file type
		contentType := file.Header.Get("Content-Type")
		if !CheckUploadType(contentType) {
			result.errMessage = "only support type: jpg / png / webp / svg / pdf"
			resultCh <- result
			return
		}
		result.filetype = contentType

		uuid := UUID(16)
		now := time.Now().UnixNano() / int64(time.Millisecond)
		filename := fmt.Sprintf("%s_%d%s", uuid, now, GetExtension(contentType))
		result.filename = filename

		// * save file
		targetPath := filepath.Join(storagePath, filename)
		if err := c.SaveUploadedFile(file, targetPath); err != nil {
			result.err = err
			result.errMessage = "can not save file"
			resultCh <- result
			return
		}

		domain := configs.GetDomain()
		src := domain + "/c/img/" + path + "/" + filename
		result.src = src
		resultCh <- result
	}()

	select {
	case result := <-resultCh:
		if result.err != nil {
			utils.HandleError(c, http.StatusBadRequest, result.errMessage, result.err)
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success":  1,
			"filename": result.filename,
			"type":     result.filetype,
			"size":     result.filesize,
			"src":      result.src,
		})
		log.Printf("└── [INFO] image link: " + result.src)

	case <-ctx.Done():
		log.Printf("└── [ERROR] timed out")
		c.String(http.StatusRequestTimeout, "timed out")
	}
}

func UUID(length int) string {
	chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	charLength := len(chars)
	key := ""

	for i := 0; i < length; i++ {
		key += string(chars[rand.Intn(charLength)])
	}

	return key
}

func CheckUploadType(mimeType string) bool {
	typeMap := map[string]bool{
		"image/jpg":       true,
		"image/jpeg":      true,
		"image/png":       true,
		"image/webp":      true,
		"image/svg+xml":   true,
		"application/pdf": true,
	}

	return typeMap[mimeType]
}

func GetExtension(mimeType string) string {
	switch mimeType {
	case "image/jpg", "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/svg+xml":
		return ".svg"
	case "application/pdf":
		return ".pdf"
	default:
		return ""
	}
}
